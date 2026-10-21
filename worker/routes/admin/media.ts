import { z } from "zod";
import { createApp, HttpError } from "../../app";
import { audit } from "../../lib/audit";
import { body } from "../../lib/guards";
import { cleanFilename, findMediaUsage, isImage, makeKey, MAX_VIDEO_BYTES, readUpload, toMediaItem, type MediaRow } from "../../lib/media";
import { newId, nowIso } from "../../lib/util";
import { multipartRoutes } from "../../lib/multipart";

export const mediaRoutes = createApp();

// Files over ~90 MB (large reports, videos) are uploaded in parts
mediaRoutes.route("/multipart", multipartRoutes("uploads"));

mediaRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 100);
  const type = c.req.query("type"); // "image" | "document"
  const page = Math.max(0, Number(c.req.query("page") ?? 0) || 0);
  const where = ["deleted_at IS NULL"];
  const binds: unknown[] = [];
  if (q) {
    where.push("(instr(lower(filename), lower(?1)) > 0 OR instr(lower(alt), lower(?1)) > 0)");
    binds.push(q);
  }
  if (type === "image") where.push("mime LIKE 'image/%'");
  if (type === "document") where.push("mime NOT LIKE 'image/%'");
  const pageSize = 60;
  const { results } = await c.env.DB.prepare(
    `SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ${pageSize + 1} OFFSET ${page * pageSize}`,
  )
    .bind(...binds)
    .all<MediaRow>();
  return c.json({ items: results.slice(0, pageSize).map(toMediaItem), hasMore: results.length > pageSize });
});

/**
 * Upload. Multipart fields:
 *  file      – the image (already resized in the browser to ≤2400px) or PDF
 *  alt       – description for screen readers
 *  width/height – pixel size reported by the browser
 *  variant_<w> – optional smaller WebP/JPEG copies for responsive images
 */
mediaRoutes.post("/", async (c) => {
  const len = Number(c.req.header("content-length") ?? 0);
  if (len > MAX_VIDEO_BYTES + 6 * 1024 * 1024) throw new HttpError(413, "That upload is too large.");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file was received.");
  const { bytes, mime, ext } = await readUpload(file, MAX_VIDEO_BYTES, "any");
  const alt = String(form.get("alt") ?? "")
    .trim()
    .slice(0, 400);
  const width = isImage(mime) ? Math.min(20000, Math.max(0, Number(form.get("width")) || 0)) || null : null;
  const height = isImage(mime) ? Math.min(20000, Math.max(0, Number(form.get("height")) || 0)) || null : null;

  const id = newId("m_");
  const filename = cleanFilename(file.name);
  const key = makeKey(id, filename, ext);
  const disposition = `inline; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"`;
  await c.env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mime, contentDisposition: disposition, cacheControl: "public, max-age=31536000, immutable" },
  });

  const variants: { w: number; key: string }[] = [];
  if (isImage(mime)) {
    for (const [name, value] of form.entries()) {
      const m = name.match(/^variant_(\d{2,4})$/);
      if (!m || !(value instanceof File)) continue;
      const v = await readUpload(value, 5 * 1024 * 1024, "image");
      const vKey = key.replace(/\.[a-z]+$/, `-${m[1]}w.${v.ext}`);
      await c.env.MEDIA.put(vKey, v.bytes, { httpMetadata: { contentType: v.mime, cacheControl: "public, max-age=31536000, immutable" } });
      variants.push({ w: Number(m[1]), key: vKey });
      if (variants.length >= 4) break;
    }
  }

  const user = c.get("user");
  await c.env.DB.prepare(
    "INSERT INTO media (id, r2_key, filename, mime, size, width, height, alt, variants_json, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      key,
      filename,
      mime,
      bytes.byteLength,
      width,
      height,
      alt,
      variants.length ? JSON.stringify(variants.sort((a, b) => a.w - b.w)) : null,
      user.id,
      nowIso(),
    )
    .run();
  await audit(c.env.DB, user, "media.upload", "media", id, filename);
  const row = await c.env.DB.prepare("SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE id = ?")
    .bind(id)
    .first<MediaRow>();
  return c.json({ item: toMediaItem(row!) }, 201);
});

mediaRoutes.put("/:id", async (c) => {
  const input = await body(c.req.raw, z.object({ alt: z.string().trim().max(400), filename: z.string().trim().min(1).max(200).optional() }));
  const r = await c.env.DB.prepare("UPDATE media SET alt = ?, filename = COALESCE(?, filename) WHERE id = ? AND deleted_at IS NULL")
    .bind(input.alt, input.filename ? input.filename.replace(/[\\/<>"]/g, "_") : null, c.req.param("id"))
    .run();
  if (!r.meta.changes) throw new HttpError(404, "File not found.");
  return c.json({ ok: true });
});

mediaRoutes.get("/:id/usage", async (c) => {
  const row = await c.env.DB.prepare("SELECT id, r2_key FROM media WHERE id = ?").bind(c.req.param("id")).first<{ id: string; r2_key: string }>();
  if (!row) throw new HttpError(404, "File not found.");
  return c.json(await findMediaUsage(c.env.DB, row.id, row.r2_key));
});

/** Delete only when nothing references the file. */
mediaRoutes.delete("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL").bind(c.req.param("id")).first<MediaRow>();
  if (!row) throw new HttpError(404, "File not found.");
  const usage = await findMediaUsage(c.env.DB, row.id, row.r2_key);
  if (usage.total > 0) throw new HttpError(409, "This file is still used on the website. Remove it from those pages first.", usage);
  const keys = [row.r2_key, ...JSON.parse(row.variants_json ?? "[]").map((v: { key: string }) => v.key)];
  await c.env.MEDIA.delete(keys);
  await c.env.DB.prepare("UPDATE media SET deleted_at = ? WHERE id = ?").bind(nowIso(), row.id).run();
  await audit(c.env.DB, c.get("user"), "media.delete", "media", row.id, row.filename);
  return c.json({ ok: true });
});
