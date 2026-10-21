import { z } from "zod";
import { pageDocSchema, type PageDoc } from "@shared/blocks";
import { isReservedPath, PAGE_PATH_RE } from "@shared/slug";
import { createApp, HttpError } from "../../app";
import { audit } from "../../lib/audit";
import { purge, resolvePath } from "../../lib/content";
import { assertCanPublish, body } from "../../lib/guards";
import { addRevision, getRevision, listRevisions } from "../../lib/revisions";
import { newId, nowIso, parseJson } from "../../lib/util";

export const pageRoutes = createApp();

type PageRow = {
  id: string;
  path: string;
  title: string;
  status: "draft" | "published" | "archived";
  draft_json: string;
  published_json: string | null;
  has_changes: number;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  updated_by_name?: string | null;
};

const pathSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .transform((p) => p.replace(/^\/+|\/+$/g, ""))
  .refine((p) => PAGE_PATH_RE.test(p), "Page addresses can only use lowercase letters, numbers and dashes (for example: our-programs)")
  .refine((p) => !isReservedPath(p), "That page address is reserved by the website. Please choose another.");

const toSummary = (r: PageRow) => ({
  id: r.id,
  path: r.path,
  title: r.title,
  status: r.status,
  hasChanges: r.has_changes === 1,
  publishedAt: r.published_at,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by_name ?? null,
});

async function getRow(db: D1Database, id: string): Promise<PageRow> {
  const row = await db.prepare("SELECT * FROM pages WHERE id = ? AND deleted_at IS NULL").bind(id).first<PageRow>();
  if (!row) throw new HttpError(404, "Page not found.");
  return row;
}

async function assertPathFree(db: D1Database, path: string, exceptId?: string) {
  const clash = await db.prepare("SELECT id, deleted_at FROM pages WHERE path = ?").bind(path).first<{ id: string; deleted_at: string | null }>();
  if (clash && clash.id !== exceptId) {
    throw new HttpError(409, clash.deleted_at ? "A deleted page still uses that address. Restore it or choose another address." : "Another page already uses that address.");
  }
}

pageRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.id, p.path, p.title, p.status, p.has_changes, p.published_at, p.updated_at, p.created_at, u.name AS updated_by_name
     FROM pages p LEFT JOIN users u ON u.id = p.updated_by WHERE p.deleted_at IS NULL ORDER BY p.path = '' DESC, p.title COLLATE NOCASE`,
  ).all<PageRow>();
  return c.json({ pages: results.map(toSummary) });
});

pageRoutes.get("/:id", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  return c.json({ page: { ...toSummary(row), doc: parseJson<PageDoc>(row.draft_json, { title: row.title, seo: {}, blocks: [] }) } });
});

const createSchema = z.object({ title: z.string().trim().min(1, "Give the page a title").max(200), path: pathSchema, copyFrom: z.string().max(64).optional() });

pageRoutes.post("/", async (c) => {
  const input = await body(c.req.raw, createSchema);
  await assertPathFree(c.env.DB, input.path);
  let doc: PageDoc = { title: input.title, seo: {}, blocks: [] };
  if (input.copyFrom) {
    const src = await getRow(c.env.DB, input.copyFrom);
    doc = { ...parseJson<PageDoc>(src.draft_json, doc), title: input.title };
  }
  const id = newId("pg_");
  const user = c.get("user");
  const now = nowIso();
  await c.env.DB.prepare(
    "INSERT INTO pages (id, path, title, status, draft_json, has_changes, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, 1, ?, ?, ?, ?)",
  )
    .bind(id, input.path, input.title, JSON.stringify(doc), user.id, user.id, now, now)
    .run();
  await audit(c.env.DB, user, "page.create", "page", id, input.path);
  return c.json({ id }, 201);
});

const saveSchema = z.object({ doc: pageDocSchema, path: pathSchema.optional(), revisionNote: z.boolean().optional() });

/** Save draft. Never affects the live site. */
pageRoutes.put("/:id", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const { doc, path } = await body(c.req.raw, saveSchema);
  const newPath = path ?? row.path;
  if (newPath !== row.path) {
    if (row.path === "") throw new HttpError(400, "The homepage address can't be changed.");
    if (c.get("user").role !== "admin" && row.status === "published") throw new HttpError(403, "Only administrators can change the address of a live page.");
    await assertPathFree(c.env.DB, newPath, row.id);
  }
  const user = c.get("user");
  const json = JSON.stringify(doc);
  const hasChanges = row.published_json !== json ? 1 : 0;
  await c.env.DB.prepare("UPDATE pages SET draft_json = ?, title = ?, path = ?, has_changes = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(json, doc.title, newPath, hasChanges, user.id, nowIso(), row.id)
    .run();
  if (newPath !== row.path && row.status === "published") {
    // Keep old links working
    await c.env.DB.prepare("INSERT INTO redirects (from_path, to_path, status_code, source, created_at) VALUES (?, ?, 301, 'manual', ?) ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path")
      .bind(`/${row.path}`, `/${newPath}`, nowIso())
      .run();
    await audit(c.env.DB, user, "page.move", "page", row.id, `/${row.path} → /${newPath}`);
  }
  await addRevision(c.env.DB, "page", row.id, "save", doc, doc.title, user.id);
  return c.json({ ok: true, hasChanges: hasChanges === 1 });
});

pageRoutes.post("/:id/publish", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  const doc = pageDocSchema.parse(JSON.parse(row.draft_json)); // re-validate before going live
  const user = c.get("user");
  const now = nowIso();
  await c.env.DB.prepare("UPDATE pages SET published_json = ?, status = 'published', has_changes = 0, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(doc), now, user.id, now, row.id)
    .run();
  await addRevision(c.env.DB, "page", row.id, "publish", doc, doc.title, user.id);
  await audit(c.env.DB, user, "page.publish", "page", row.id, `/${row.path}`);
  c.executionCtx.waitUntil(purge([row.path]));
  return c.json({ ok: true });
});

pageRoutes.post("/:id/unpublish", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  if (row.path === "") throw new HttpError(400, "The homepage can't be unpublished.");
  await c.env.DB.prepare("UPDATE pages SET status = 'draft', has_changes = 1, updated_by = ?, updated_at = ? WHERE id = ?").bind(c.get("user").id, nowIso(), row.id).run();
  await audit(c.env.DB, c.get("user"), "page.unpublish", "page", row.id, `/${row.path}`);
  c.executionCtx.waitUntil(purge([row.path]));
  return c.json({ ok: true });
});

/** Discard draft edits and go back to the live version. */
pageRoutes.post("/:id/discard", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  if (!row.published_json) throw new HttpError(400, "This page has never been published, so there's no live version to go back to.");
  await c.env.DB.prepare("UPDATE pages SET draft_json = published_json, has_changes = 0, updated_by = ?, updated_at = ? WHERE id = ?").bind(c.get("user").id, nowIso(), row.id).run();
  return c.json({ ok: true });
});

/** Move to trash (soft delete). Administrators only; the homepage is protected. */
pageRoutes.delete("/:id", async (c) => {
  if (c.get("user").role !== "admin") throw new HttpError(403, "Only administrators can delete pages.");
  const row = await getRow(c.env.DB, c.req.param("id"));
  if (row.path === "") throw new HttpError(400, "The homepage can't be deleted.");
  await c.env.DB.prepare("UPDATE pages SET deleted_at = ?, status = 'archived', updated_by = ?, updated_at = ? WHERE id = ?").bind(nowIso(), c.get("user").id, nowIso(), row.id).run();
  await audit(c.env.DB, c.get("user"), "page.delete", "page", row.id, `/${row.path}`);
  c.executionCtx.waitUntil(purge([row.path]));
  return c.json({ ok: true });
});

pageRoutes.get("/trash/list", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, path, title, status, has_changes, published_at, updated_at, created_at FROM pages WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<PageRow>();
  return c.json({ pages: results.map(toSummary) });
});

pageRoutes.post("/:id/restore", async (c) => {
  if (c.get("user").role !== "admin") throw new HttpError(403, "Only administrators can restore pages.");
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT path FROM pages WHERE id = ? AND deleted_at IS NOT NULL").bind(id).first<{ path: string }>();
  if (!row) throw new HttpError(404, "Page not found in trash.");
  await c.env.DB.prepare("UPDATE pages SET deleted_at = NULL, status = 'draft', has_changes = 1, updated_at = ? WHERE id = ?").bind(nowIso(), id).run();
  await audit(c.env.DB, c.get("user"), "page.restore", "page", id, `/${row.path}`);
  return c.json({ ok: true });
});

pageRoutes.get("/:id/revisions", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  return c.json({ revisions: await listRevisions(c.env.DB, "page", row.id) });
});

pageRoutes.get("/:id/revisions/:rev", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const rev = await getRevision(c.env.DB, "page", row.id, Number(c.req.param("rev")));
  if (!rev) throw new HttpError(404, "Version not found.");
  return c.json({ doc: JSON.parse(rev.data_json) });
});

/** Restore an earlier version into the draft (publishing it is a separate, deliberate step). */
pageRoutes.post("/:id/revisions/:rev/restore", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const rev = await getRevision(c.env.DB, "page", row.id, Number(c.req.param("rev")));
  if (!rev) throw new HttpError(404, "Version not found.");
  const parsed = pageDocSchema.safeParse(JSON.parse(rev.data_json));
  if (!parsed.success) throw new HttpError(422, "That version can't be restored because it's no longer valid.");
  const json = JSON.stringify(parsed.data);
  await c.env.DB.prepare("UPDATE pages SET draft_json = ?, title = ?, has_changes = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(json, parsed.data.title, row.published_json !== json ? 1 : 0, c.get("user").id, nowIso(), row.id)
    .run();
  await addRevision(c.env.DB, "page", row.id, "restore", parsed.data, parsed.data.title, c.get("user").id);
  await audit(c.env.DB, c.get("user"), "page.revision.restore", "page", row.id, `revision ${c.req.param("rev")}`);
  return c.json({ ok: true });
});

/** Draft data for the private preview tab. */
pageRoutes.get("/:id/preview", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  return c.json(await resolvePath(c.env.DB, row.path, { preview: true }));
});
