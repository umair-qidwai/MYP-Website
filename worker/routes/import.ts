/**
 * Bulk import API used by scripts/import (Wix migration). Disabled unless the IMPORT_TOKEN
 * secret is set; remove the secret after importing.
 *
 * Idempotent: records are matched by path / (collection, slug) / source URL. Re-running the
 * import updates items that no person has edited yet and leaves staff edits untouched.
 */
import { z } from "zod";
import { pageDocSchema } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import { entryDocSchema } from "@shared/collections-schema";
import { SETTINGS_KEYS, SETTINGS_SCHEMAS, type SettingsKey } from "@shared/settings";
import { normalizePath, PAGE_PATH_RE, SLUG_RE } from "@shared/slug";
import { createApp, HttpError } from "../app";
import { body } from "../lib/guards";
import { cleanFilename, isImage, makeKey, MAX_VIDEO_BYTES, readUpload, toMediaItem, type MediaRow } from "../lib/media";
import { addRevision } from "../lib/revisions";
import { newId, nowIso, safeEqual } from "../lib/util";
import { multipartRoutes } from "../lib/multipart";

export const importRoutes = createApp();

importRoutes.use("*", async (c, next) => {
  const token = c.env.IMPORT_TOKEN;
  const auth = c.req.header("authorization") ?? "";
  if (!token || token.length < 24) throw new HttpError(404, "Not found.");
  if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), token)) throw new HttpError(401, "Invalid import token.");
  await next();
  c.header("Cache-Control", "no-store");
});

importRoutes.route("/media/multipart", multipartRoutes("imported"));

/** Look up an already-imported file by its original URL (lets large-file imports stay idempotent). */
importRoutes.get("/media/by-source", async (c) => {
  const row = await c.env.DB.prepare("SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE source_url = ?")
    .bind(c.req.query("url") ?? "")
    .first<MediaRow>();
  return row ? c.json({ item: toMediaItem(row) }) : c.json({ item: null }, 404);
});

importRoutes.post("/media", async (c) => {
  const form = await c.req.formData();
  const sourceUrl = String(form.get("sourceUrl") ?? "").slice(0, 2048);
  if (!sourceUrl) throw new HttpError(400, "sourceUrl is required");
  const existing = await c.env.DB.prepare(
    "SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE source_url = ?",
  )
    .bind(sourceUrl)
    .first<MediaRow>();
  if (existing) return c.json({ item: toMediaItem(existing), existed: true });

  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file is required");
  const { bytes, mime, ext } = await readUpload(file, MAX_VIDEO_BYTES, "any");
  const id = newId("m_");
  const filename = cleanFilename(String(form.get("filename") ?? file.name));
  const key = makeKey(id, filename, ext, "imported");
  await c.env.MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType: mime,
      contentDisposition: `inline; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"`,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  const variants: { w: number; key: string }[] = [];
  for (const [name, value] of form.entries()) {
    const m = name.match(/^variant_(\d{2,4})$/);
    if (!m || !(value instanceof File) || !isImage(mime)) continue;
    const v = await readUpload(value, 5 * 1024 * 1024, "image");
    const vKey = key.replace(/\.[a-z]+$/, `-${m[1]}w.${v.ext}`);
    await c.env.MEDIA.put(vKey, v.bytes, { httpMetadata: { contentType: v.mime, cacheControl: "public, max-age=31536000, immutable" } });
    variants.push({ w: Number(m[1]), key: vKey });
  }
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  await c.env.DB.prepare(
    "INSERT INTO media (id, r2_key, filename, mime, size, width, height, alt, variants_json, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      key,
      filename,
      mime,
      bytes.byteLength,
      width,
      height,
      String(form.get("alt") ?? "").slice(0, 400),
      variants.length ? JSON.stringify(variants.sort((a, b) => a.w - b.w)) : null,
      sourceUrl,
      nowIso(),
    )
    .run();
  const row = await c.env.DB.prepare("SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE id = ?")
    .bind(id)
    .first<MediaRow>();
  return c.json({ item: toMediaItem(row!), existed: false }, 201);
});

const contentSchema = z.object({
  pages: z.array(z.object({ path: z.string(), sourceUrl: z.string().optional(), publish: z.boolean().default(true), doc: z.unknown() })).default([]),
  entries: z
    .array(
      z.object({
        collection: z.string(),
        slug: z.string(),
        sourceUrl: z.string().optional(),
        sortOrder: z.number().int().default(0),
        publish: z.boolean().default(true),
        doc: z.unknown(),
      }),
    )
    .default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
  redirects: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
});

importRoutes.post("/content", async (c) => {
  const input = await body(c.req.raw, contentSchema, 20_000_000);
  const db = c.env.DB;
  const report = { created: 0, updated: 0, skipped: [] as string[], errors: [] as string[] };
  const now = nowIso();

  for (const p of input.pages) {
    const parsed = pageDocSchema.safeParse(p.doc);
    if (!parsed.success || !PAGE_PATH_RE.test(p.path)) {
      report.errors.push(
        `page /${p.path}: ${
          parsed.success
            ? "invalid path"
            : parsed.error.issues
                .slice(0, 3)
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
        }`,
      );
      continue;
    }
    const json = JSON.stringify(parsed.data);
    const existing = await db.prepare("SELECT id, updated_by FROM pages WHERE path = ?").bind(p.path).first<{ id: string; updated_by: string | null }>();
    if (existing?.updated_by) {
      report.skipped.push(`/${p.path} (edited by staff)`);
      continue;
    }
    const id = existing?.id ?? newId("pg_");
    await db
      .prepare(
        `INSERT INTO pages (id, path, title, status, draft_json, published_json, has_changes, source_url, published_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?9)
         ON CONFLICT(path) DO UPDATE SET title = excluded.title, status = excluded.status, draft_json = excluded.draft_json,
           published_json = excluded.published_json, has_changes = 0, source_url = excluded.source_url, published_at = excluded.published_at,
           updated_at = excluded.updated_at, deleted_at = NULL`,
      )
      .bind(id, p.path, parsed.data.title, p.publish ? "published" : "draft", json, p.publish ? json : null, p.sourceUrl ?? null, p.publish ? now : null, now)
      .run();
    await addRevision(db, "page", id, "import", parsed.data, parsed.data.title, null);
    if (existing) report.updated++;
    else report.created++;
  }

  for (const e of input.entries) {
    const def = getCollection(e.collection);
    if (!def || !SLUG_RE.test(e.slug)) {
      report.errors.push(`entry ${e.collection}/${e.slug}: unknown collection or invalid slug`);
      continue;
    }
    const parsed = entryDocSchema(def).safeParse(e.doc);
    if (!parsed.success) {
      report.errors.push(
        `entry ${e.collection}/${e.slug}: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
      continue;
    }
    const json = JSON.stringify(parsed.data);
    const dateVal = def.dateField ? parsed.data.data[def.dateField] : undefined;
    const sortDate = typeof dateVal === "string" && dateVal ? dateVal : null;
    // Match by original source first (stable even if a title/slug changes), then by slug
    const bySource = e.sourceUrl
      ? await db
          .prepare("SELECT id, slug, updated_by FROM entries WHERE collection = ? AND source_url = ? AND deleted_at IS NULL")
          .bind(def.key, e.sourceUrl)
          .first<{ id: string; slug: string; updated_by: string | null }>()
      : null;
    const existing =
      bySource ??
      (await db
        .prepare("SELECT id, slug, updated_by FROM entries WHERE collection = ? AND slug = ?")
        .bind(def.key, e.slug)
        .first<{ id: string; slug: string; updated_by: string | null }>());
    if (existing?.updated_by) {
      report.skipped.push(`${def.key}/${existing.slug} (edited by staff)`);
      continue;
    }
    let slug = e.slug;
    if (existing && existing.slug !== e.slug) {
      const clash = await db.prepare("SELECT id FROM entries WHERE collection = ? AND slug = ? AND id != ?").bind(def.key, e.slug, existing.id).first();
      if (clash) slug = existing.slug;
      else if (def.publicPath) {
        await db
          .prepare(
            "INSERT INTO redirects (from_path, to_path, status_code, source, created_at) VALUES (?, ?, 301, 'import', ?) ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path",
          )
          .bind(`/${def.publicPath}/${existing.slug}`, `/${def.publicPath}/${slug}`, now)
          .run();
      }
    }
    const id = existing?.id ?? newId("en_");
    if (existing) {
      await db
        .prepare(
          `UPDATE entries SET slug = ?, title = ?, status = ?, sort_order = ?, sort_date = ?, draft_json = ?, published_json = ?, has_changes = 0,
             source_url = ?, published_at = ?, updated_at = ?, deleted_at = NULL WHERE id = ?`,
        )
        .bind(
          slug,
          parsed.data.title,
          e.publish ? "published" : "draft",
          e.sortOrder,
          sortDate,
          json,
          e.publish ? json : null,
          e.sourceUrl ?? null,
          e.publish ? now : null,
          now,
          id,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO entries (id, collection, slug, title, status, sort_order, sort_date, draft_json, published_json, has_changes, source_url, published_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          def.key,
          slug,
          parsed.data.title,
          e.publish ? "published" : "draft",
          e.sortOrder,
          sortDate,
          json,
          e.publish ? json : null,
          e.sourceUrl ?? null,
          e.publish ? now : null,
          now,
          now,
        )
        .run();
    }
    if (existing) report.updated++;
    else report.created++;
  }

  for (const [key, value] of Object.entries(input.settings)) {
    if (!SETTINGS_KEYS.includes(key as SettingsKey)) {
      report.errors.push(`setting ${key}: unknown`);
      continue;
    }
    const parsed = SETTINGS_SCHEMAS[key as SettingsKey].safeParse(value);
    if (!parsed.success) {
      report.errors.push(`setting ${key}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const r = await db
      .prepare(
        `INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at WHERE settings.updated_by IS NULL`,
      )
      .bind(key, JSON.stringify(parsed.data), now)
      .run();
    if (!r.meta.changes) report.skipped.push(`setting ${key} (edited by staff)`);
  }

  const stmts = input.redirects
    .map((r) => ({ from: normalizePath(r.from), to: r.to }))
    .filter((r) => r.from !== "/" && r.from.startsWith("/") && (r.to.startsWith("/") || r.to.startsWith("https://")))
    .map((r) =>
      db
        .prepare(
          `INSERT INTO redirects (from_path, to_path, status_code, source, created_at) VALUES (?, ?, 301, 'import', ?)
           ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path WHERE redirects.source = 'import'`,
        )
        .bind(r.from, r.to, now),
    );
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));

  return c.json({ ...report, redirects: stmts.length });
});
