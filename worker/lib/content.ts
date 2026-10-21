/**
 * Reading published content for the public site, with a short-lived edge cache.
 * Each public page view costs ~2–4 D1 row reads on a cache miss and zero on a hit.
 */
import { TRANSLATION_LANGS, type BlockOf, type PageDoc } from "@shared/blocks";
import { getCollection, COLLECTIONS, type EntryDoc } from "@shared/collections";
import { DEFAULT_SETTINGS, SETTINGS_KEYS, type Settings } from "@shared/settings";
import type { PublicEntry, PublicPagePayload } from "@shared/types";
import { parseJson } from "./util";

const CACHE_ORIGIN = "https://cache.myprojectusa.internal";
const PUBLIC_TTL = 60; // seconds; publish actions purge the local edge cache immediately

export type EntryRow = {
  id: string;
  collection: string;
  slug: string;
  title: string;
  status: string;
  sort_order: number;
  sort_date: string | null;
  draft_json: string;
  published_json: string | null;
};

export function rowToPublicEntry(row: EntryRow, which: "published" | "draft" = "published"): PublicEntry & { seo?: EntryDoc["seo"] } {
  const doc = parseJson<EntryDoc>(which === "published" ? row.published_json : row.draft_json, { title: row.title, data: {} });
  return { id: row.id, collection: row.collection, slug: row.slug, title: doc.title || row.title, date: row.sort_date, data: doc.data ?? {}, seo: doc.seo };
}

function orderClause(collection: string): string {
  const def = getCollection(collection);
  if (def?.sortBy === "manual") return "ORDER BY sort_order ASC, sort_date DESC, title ASC";
  if (def?.sortBy === "date-asc") return "ORDER BY sort_date IS NULL, sort_date ASC, sort_order ASC";
  return "ORDER BY sort_date IS NULL, sort_date DESC, sort_order ASC, title ASC";
}

export async function listPublishedEntries(db: D1Database, collection: string, limit = 500): Promise<PublicEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT id, collection, slug, title, status, sort_order, sort_date, draft_json, published_json FROM entries
       WHERE collection = ? AND status = 'published' AND deleted_at IS NULL AND published_json IS NOT NULL ${orderClause(collection)} LIMIT ?`,
    )
    .bind(collection, Math.min(limit, 500))
    .all<EntryRow>();
  return results.map((r) => {
    const e = rowToPublicEntry(r);
    delete e.seo;
    return e;
  });
}

export async function getSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value_json FROM settings").all<{ key: string; value_json: string }>();
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of results) if ((SETTINGS_KEYS as string[]).includes(r.key)) out[r.key] = { ...(out[r.key] as object), ...parseJson(r.value_json, {}) };
  return out as Settings;
}

/** Collections referenced by `collection` blocks on a page, loaded in one pass. */
async function collectionsForPage(db: D1Database, page: PageDoc): Promise<Record<string, PublicEntry[]>> {
  const wanted = new Map<string, number>();
  for (const b of page.blocks) {
    if (b.type === "collection" && !b.hidden && getCollection(b.collection)) {
      const blk = b as BlockOf<"collection">;
      wanted.set(blk.collection, Math.max(wanted.get(blk.collection) ?? 0, blk.limit));
    }
  }
  const out: Record<string, PublicEntry[]> = {};
  for (const [key, limit] of wanted) out[key] = await listPublishedEntries(db, key, limit);
  return out;
}

/** Resolve a public path to page/entry content. `preview` returns drafts (callers must authorise). */
export async function resolvePath(db: D1Database, rawPath: string, opts: { preview?: boolean } = {}): Promise<PublicPagePayload> {
  const path = rawPath.replace(/^\/+|\/+$/g, "").toLowerCase();
  const segs = path.split("/");

  // Collection entry detail: /events/<slug>, /blog/<slug>
  const def = COLLECTIONS.find((c) => c.publicPath && c.publicPath === segs[0]);
  if (def && segs.length === 2) {
    const row = await db
      .prepare(
        `SELECT id, collection, slug, title, status, sort_order, sort_date, draft_json, published_json FROM entries
         WHERE collection = ? AND slug = ? AND deleted_at IS NULL ${opts.preview ? "" : "AND status = 'published' AND published_json IS NOT NULL"}`,
      )
      .bind(def.key, segs[1])
      .first<EntryRow>();
    if (!row) return { kind: "notFound", path };
    const entry = rowToPublicEntry(row, opts.preview ? "draft" : "published");
    const related = (await listPublishedEntries(db, def.key, 7)).filter((e) => e.id !== entry.id).slice(0, 6);
    return { kind: "entry", path, collection: def.key, entry, related, preview: opts.preview || undefined };
  }

  const row = await db
    .prepare(
      `SELECT draft_json, published_json, status FROM pages WHERE path = ? AND deleted_at IS NULL ${opts.preview ? "" : "AND status = 'published' AND published_json IS NOT NULL"}`,
    )
    .bind(path)
    .first<{ draft_json: string; published_json: string | null; status: string }>();
  if (!row) return { kind: "notFound", path };
  const page = parseJson<PageDoc | null>(opts.preview ? row.draft_json : row.published_json, null);
  if (!page) return { kind: "notFound", path };
  page.blocks = page.blocks.filter((b) => !b.hidden);
  return { kind: "page", path, page, collections: await collectionsForPage(db, page), translations: await translationsFor(db, path), preview: opts.preview || undefined };
}

/** Find language versions of a page: "free-clinic" ↔ "es/free-clinic", "ar/free-clinic", ... */
async function translationsFor(db: D1Database, path: string): Promise<Record<string, string> | undefined> {
  const m = path.match(/^(ar|es|fr|ht|so)\/(.+)$/);
  const basePath = m ? m[2] : path;
  const candidates = [basePath, ...TRANSLATION_LANGS.map((l) => `${l}/${basePath}`)];
  const { results } = await db
    .prepare(`SELECT path FROM pages WHERE path IN (${candidates.map(() => "?").join(",")}) AND status = 'published' AND deleted_at IS NULL`)
    .bind(...candidates)
    .all<{ path: string }>();
  if (results.length < 2) return undefined;
  const out: Record<string, string> = {};
  for (const r of results) out[r.path === basePath ? "en" : r.path.split("/")[0]] = r.path;
  return out;
}

// ── Edge cache (Cache API is per-data-centre; TTL bounds staleness elsewhere) ─────────────

export type WaitUntil = { waitUntil(promise: Promise<unknown>): void };

async function cached<T>(env: Env, ctx: WaitUntil, key: string, load: () => Promise<T>): Promise<T> {
  if (env.ENVIRONMENT === "development") return load(); // always fresh while developing
  const cache = caches.default;
  const req = new Request(`${CACHE_ORIGIN}/${encodeURIComponent(key)}`);
  const hit = await cache.match(req);
  if (hit) return (await hit.json()) as T;
  const value = await load();
  ctx.waitUntil(cache.put(req, new Response(JSON.stringify(value), { headers: { "content-type": "application/json", "cache-control": `max-age=${PUBLIC_TTL}` } })));
  return value;
}

export const cachedSettings = (env: Env, ctx: WaitUntil) => cached(env, ctx, "settings", () => getSettings(env.DB));
export const cachedPath = (env: Env, ctx: WaitUntil, path: string) =>
  cached(env, ctx, `path:${path.replace(/^\/+|\/+$/g, "").toLowerCase()}`, () => resolvePath(env.DB, path));

/** Purge cache entries after a publish. Pass the paths that changed (and whether settings changed). */
export async function purge(paths: string[], settings = false): Promise<void> {
  const cache = caches.default;
  const keys = paths.map((p) => `path:${p.replace(/^\/+|\/+$/g, "").toLowerCase()}`);
  if (settings) keys.push("settings");
  await Promise.all(keys.map((k) => cache.delete(new Request(`${CACHE_ORIGIN}/${encodeURIComponent(k)}`))));
}

/** Rewrite stored /media/ URLs to the public R2 domain when one is configured. */
export function withMediaBase<T>(value: T, base: string | undefined): T {
  if (!base) return value;
  const b = base.replace(/\/+$/, "");
  return JSON.parse(JSON.stringify(value).replaceAll('"/media/', `"${b}/`)) as T;
}
