import { z } from "zod";
import { COLLECTIONS, getCollection, type CollectionDef, type EntryDoc } from "@shared/collections";
import { entryDocSchema } from "@shared/collections-schema";
import { SLUG_RE, slugify } from "@shared/slug";
import { createApp, HttpError } from "../../app";
import { audit } from "../../lib/audit";
import { purge, resolvePath, type EntryRow } from "../../lib/content";
import { assertCanPublish, body } from "../../lib/guards";
import { addRevision, getRevision, listRevisions } from "../../lib/revisions";
import { newId, nowIso, parseJson } from "../../lib/util";

export const entryRoutes = createApp();

type Row = EntryRow & {
  has_changes: number;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  deleted_at: string | null;
  updated_by_name?: string | null;
};

function def(key: string): CollectionDef {
  const d = getCollection(key);
  if (!d) throw new HttpError(404, "Unknown collection.");
  return d;
}

const summary = (r: Row) => {
  const doc = parseJson<EntryDoc>(r.draft_json, { title: r.title, data: {} });
  const img = (doc.data.image ?? doc.data.cover) as { src?: string } | undefined;
  return {
    id: r.id,
    collection: r.collection,
    slug: r.slug,
    title: r.title,
    status: r.status,
    sortOrder: r.sort_order,
    date: r.sort_date,
    hasChanges: r.has_changes === 1,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by_name ?? null,
    thumb: img?.src ?? null,
  };
};

async function getRow(db: D1Database, id: string): Promise<Row> {
  const row = await db.prepare("SELECT * FROM entries WHERE id = ? AND deleted_at IS NULL").bind(id).first<Row>();
  if (!row) throw new HttpError(404, "Item not found.");
  return row;
}

const pathsFor = (d: CollectionDef, slug: string) => (d.publicPath ? [`${d.publicPath}/${slug}`, d.publicPath] : []);

entryRoutes.get("/collections", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT collection, status, COUNT(*) AS n FROM entries WHERE deleted_at IS NULL GROUP BY collection, status").all<{
    collection: string;
    status: string;
    n: number;
  }>();
  return c.json({
    collections: COLLECTIONS.map((d) => ({
      ...d,
      counts: Object.fromEntries(results.filter((r) => r.collection === d.key).map((r) => [r.status, r.n])),
    })),
  });
});

entryRoutes.get("/", async (c) => {
  const d = def(c.req.query("collection") ?? "");
  const q = (c.req.query("q") ?? "").trim().slice(0, 100);
  const status = c.req.query("status");
  const where = ["e.collection = ?", "e.deleted_at IS NULL"];
  const binds: unknown[] = [d.key];
  if (status && ["draft", "published", "archived"].includes(status)) {
    where.push("e.status = ?");
    binds.push(status);
  }
  if (q) {
    where.push("instr(lower(e.title), lower(?)) > 0");
    binds.push(q);
  }
  const order = d.sortBy === "manual" ? "e.sort_order ASC, e.sort_date DESC" : "e.sort_date IS NULL, e.sort_date DESC, e.sort_order ASC";
  const { results } = await c.env.DB.prepare(
    `SELECT e.*, u.name AS updated_by_name FROM entries e LEFT JOIN users u ON u.id = e.updated_by WHERE ${where.join(" AND ")} ORDER BY ${order}, e.title COLLATE NOCASE LIMIT 1000`,
  )
    .bind(...binds)
    .all<Row>();
  return c.json({ entries: results.map(summary) });
});

entryRoutes.get("/:id", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  return c.json({ entry: { ...summary(row), doc: parseJson<EntryDoc>(row.draft_json, { title: row.title, data: {} }) } });
});

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .refine((s) => SLUG_RE.test(s), "Web addresses can only use lowercase letters, numbers and dashes");

async function uniqueSlug(db: D1Database, collection: string, base: string, exceptId?: string): Promise<string> {
  let slug = base || "item";
  for (let i = 2; i < 200; i++) {
    const clash = await db.prepare("SELECT id FROM entries WHERE collection = ? AND slug = ?").bind(collection, slug).first<{ id: string }>();
    if (!clash || clash.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
  throw new HttpError(409, "Couldn't find a free web address for this item.");
}

const sortDate = (d: CollectionDef, doc: EntryDoc) => {
  const v = d.dateField ? doc.data[d.dateField] : undefined;
  return typeof v === "string" && v ? v : null;
};

entryRoutes.post("/", async (c) => {
  const input = await body(c.req.raw, z.object({ collection: z.string(), title: z.string().trim().min(1, "Add a title").max(300) }));
  const d = def(input.collection);
  const id = newId("en_");
  const slug = await uniqueSlug(c.env.DB, d.key, slugify(input.title));
  const doc: EntryDoc = { title: input.title, data: {}, seo: {} };
  const user = c.get("user");
  const now = nowIso();
  const min = await c.env.DB.prepare("SELECT MIN(sort_order) AS m FROM entries WHERE collection = ?").bind(d.key).first<{ m: number | null }>();
  await c.env.DB.prepare(
    "INSERT INTO entries (id, collection, slug, title, status, sort_order, draft_json, has_changes, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, 1, ?, ?, ?, ?)",
  )
    .bind(id, d.key, slug, input.title, (min?.m ?? 0) - 1, JSON.stringify(doc), user.id, user.id, now, now)
    .run();
  await audit(c.env.DB, user, "entry.create", d.key, id, input.title);
  return c.json({ id }, 201);
});

entryRoutes.put("/:id", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const d = def(row.collection);
  const input = await body(c.req.raw, z.object({ doc: entryDocSchema(d), slug: slugSchema.optional() }));
  let slug = row.slug;
  if (input.slug && input.slug !== row.slug) {
    const clash = await c.env.DB.prepare("SELECT id FROM entries WHERE collection = ? AND slug = ? AND id != ?").bind(d.key, input.slug, row.id).first();
    if (clash) throw new HttpError(409, "Another item already uses that web address.");
    slug = input.slug;
    if (row.status === "published" && d.publicPath) {
      await c.env.DB.prepare(
        "INSERT INTO redirects (from_path, to_path, status_code, source, created_at) VALUES (?, ?, 301, 'manual', ?) ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path",
      )
        .bind(`/${d.publicPath}/${row.slug}`, `/${d.publicPath}/${slug}`, nowIso())
        .run();
    }
  }
  const json = JSON.stringify(input.doc);
  await c.env.DB.prepare("UPDATE entries SET draft_json = ?, title = ?, slug = ?, sort_date = ?, has_changes = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(json, input.doc.title, slug, sortDate(d, input.doc), row.published_json !== json ? 1 : 0, c.get("user").id, nowIso(), row.id)
    .run();
  await addRevision(c.env.DB, "entry", row.id, "save", { ...input.doc, slug }, input.doc.title, c.get("user").id);
  return c.json({ ok: true, slug });
});

entryRoutes.post("/:id/publish", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  const d = def(row.collection);
  const doc = entryDocSchema(d).parse(JSON.parse(row.draft_json));
  const now = nowIso();
  await c.env.DB.prepare(
    "UPDATE entries SET published_json = ?, status = 'published', has_changes = 0, sort_date = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?",
  )
    .bind(JSON.stringify(doc), sortDate(d, doc), now, c.get("user").id, now, row.id)
    .run();
  await addRevision(c.env.DB, "entry", row.id, "publish", { ...doc, slug: row.slug }, doc.title, c.get("user").id);
  await audit(c.env.DB, c.get("user"), "entry.publish", d.key, row.id, doc.title);
  c.executionCtx.waitUntil(purge(pathsFor(d, row.slug)));
  return c.json({ ok: true });
});

entryRoutes.post("/:id/unpublish", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  await c.env.DB.prepare("UPDATE entries SET status = 'draft', has_changes = 1, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(c.get("user").id, nowIso(), row.id)
    .run();
  await audit(c.env.DB, c.get("user"), "entry.unpublish", row.collection, row.id, row.title);
  c.executionCtx.waitUntil(purge(pathsFor(def(row.collection), row.slug)));
  return c.json({ ok: true });
});

entryRoutes.post("/:id/archive", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  await c.env.DB.prepare("UPDATE entries SET status = 'archived', updated_by = ?, updated_at = ? WHERE id = ?").bind(c.get("user").id, nowIso(), row.id).run();
  await audit(c.env.DB, c.get("user"), "entry.archive", row.collection, row.id, row.title);
  c.executionCtx.waitUntil(purge(pathsFor(def(row.collection), row.slug)));
  return c.json({ ok: true });
});

entryRoutes.post("/:id/discard", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  if (!row.published_json) throw new HttpError(400, "This item has never been published.");
  const doc = parseJson<EntryDoc>(row.published_json, { title: row.title, data: {} });
  await c.env.DB.prepare("UPDATE entries SET draft_json = published_json, title = ?, has_changes = 0, updated_at = ? WHERE id = ?")
    .bind(doc.title, nowIso(), row.id)
    .run();
  return c.json({ ok: true });
});

/** Soft delete. Deleted items stay recoverable from the database for audit purposes. */
entryRoutes.delete("/:id", async (c) => {
  assertCanPublish(c);
  const row = await getRow(c.env.DB, c.req.param("id"));
  // Free the slug so a new item can reuse the address
  await c.env.DB.prepare(
    "UPDATE entries SET deleted_at = ?, status = 'archived', slug = slug || '--deleted-' || ?, updated_by = ?, updated_at = ? WHERE id = ?",
  )
    .bind(nowIso(), Date.now().toString(36), c.get("user").id, nowIso(), row.id)
    .run();
  await audit(c.env.DB, c.get("user"), "entry.delete", row.collection, row.id, row.title);
  c.executionCtx.waitUntil(purge(pathsFor(def(row.collection), row.slug)));
  return c.json({ ok: true });
});

entryRoutes.post("/reorder", async (c) => {
  const input = await body(c.req.raw, z.object({ collection: z.string(), ids: z.array(z.string().max(64)).max(1000) }));
  def(input.collection);
  const stmts = input.ids.map((id, i) => c.env.DB.prepare("UPDATE entries SET sort_order = ? WHERE id = ? AND collection = ?").bind(i, id, input.collection));
  for (let i = 0; i < stmts.length; i += 100) await c.env.DB.batch(stmts.slice(i, i + 100));
  await audit(c.env.DB, c.get("user"), "entry.reorder", input.collection);
  return c.json({ ok: true });
});

entryRoutes.get("/:id/revisions", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  return c.json({ revisions: await listRevisions(c.env.DB, "entry", row.id) });
});

entryRoutes.post("/:id/revisions/:rev/restore", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const d = def(row.collection);
  const rev = await getRevision(c.env.DB, "entry", row.id, Number(c.req.param("rev")));
  if (!rev) throw new HttpError(404, "Version not found.");
  const parsed = entryDocSchema(d).safeParse(JSON.parse(rev.data_json));
  if (!parsed.success) throw new HttpError(422, "That version can't be restored because it's no longer valid.");
  const json = JSON.stringify(parsed.data);
  await c.env.DB.prepare("UPDATE entries SET draft_json = ?, title = ?, sort_date = ?, has_changes = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(json, parsed.data.title, sortDate(d, parsed.data), row.published_json !== json ? 1 : 0, c.get("user").id, nowIso(), row.id)
    .run();
  await addRevision(c.env.DB, "entry", row.id, "restore", { ...parsed.data, slug: row.slug }, parsed.data.title, c.get("user").id);
  return c.json({ ok: true });
});

entryRoutes.get("/:id/preview", async (c) => {
  const row = await getRow(c.env.DB, c.req.param("id"));
  const d = def(row.collection);
  if (!d.publicPath) return c.json({ kind: "notFound", path: "" });
  return c.json(await resolvePath(c.env.DB, `${d.publicPath}/${row.slug}`, { preview: true }));
});
