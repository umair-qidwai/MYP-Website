/**
 * Upload the migration bundle to a running site (local dev or a deployed Worker).
 *
 *  1. Downloads each media file from Wix (cached in migration/media-cache, polite rate)
 *  2. Uploads it through POST /api/import/media (idempotent by source URL)
 *  3. Replaces "wix-media:<key>" placeholders with the uploaded /media/ URLs
 *  4. Imports pages, entries, settings and redirects through POST /api/import/content
 *
 * Usage:
 *   npx tsx scripts/import/push.ts --target=http://localhost:5180            (token read from .dev.vars)
 *   IMPORT_TOKEN=... npx tsx scripts/import/push.ts --target=https://<your-worker>.workers.dev
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const TARGET = (args.target ?? "http://localhost:5180").replace(/\/$/, "");
const TOKEN =
  process.env.IMPORT_TOKEN ??
  (existsSync(".dev.vars")
    ? readFileSync(".dev.vars", "utf8")
        .match(/^IMPORT_TOKEN=(.+)$/m)?.[1]
        ?.trim()
    : undefined);
if (!TOKEN) throw new Error("Set IMPORT_TOKEN (or add it to .dev.vars)");

const BUNDLE = "migration/bundle";
const CACHE = "migration/media-cache";
const UA = "Mozilla/5.0 (Macintosh) MYP-migration-import";
mkdirSync(CACHE, { recursive: true });

type MediaEntry = {
  key: string;
  kind: "image" | "file" | "video";
  sourceUrl: string;
  download: string;
  variants: { w: number; url: string }[];
  alt: string;
  filename: string;
};
type Uploaded = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  size: number;
  filename: string;
  variants: { w: number; url: string }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string, file: string): Promise<Buffer> {
  if (existsSync(file)) return readFileSync(file);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      await sleep(250);
      return buf;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1000 * attempt);
    }
  }
  throw new Error("unreachable");
}

const extOf = (url: string, fallback: string) => url.match(/\.([a-z0-9]{2,4})(?:$|\?)/i)?.[1]?.toLowerCase() ?? fallback;
const mimeFor = (ext: string) =>
  ({
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    pdf: "application/pdf",
    mp4: "video/mp4",
  })[ext] ?? "application/octet-stream";

async function uploadOne(m: MediaEntry): Promise<Uploaded> {
  // Skip the download entirely when this file was already imported
  const existing = await fetch(`${TARGET}/api/import/media/by-source?url=${encodeURIComponent(m.sourceUrl)}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  if (existing.ok) return ((await existing.json()) as { item: Uploaded }).item;
  const ext = m.kind === "file" ? "pdf" : m.kind === "video" ? "mp4" : extOf(m.download, "jpg");
  const main = await download(m.download, path.join(CACHE, `${m.key}.${ext}`));
  if (main.byteLength > 85 * 1024 * 1024) return uploadMultipart(m, main, ext);
  const form = new FormData();
  form.append("sourceUrl", m.sourceUrl);
  form.append("alt", m.alt);
  form.append("filename", m.filename);
  form.append("file", new Blob([new Uint8Array(main)], { type: mimeFor(ext) }), m.filename);
  if (m.kind === "image") {
    try {
      const dim = imageSize(main);
      if (dim.width && dim.height) {
        form.append("width", String(dim.width));
        form.append("height", String(dim.height));
      }
    } catch {
      /* unknown format — the server still validates it */
    }
    for (const v of m.variants) {
      const buf = await download(v.url, path.join(CACHE, `${m.key}-${v.w}.webp`));
      form.append(`variant_${v.w}`, new Blob([new Uint8Array(buf)], { type: "image/webp" }), `${m.key}-${v.w}.webp`);
    }
  }
  const res = await fetch(`${TARGET}/api/import/media`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: form });
  const data = (await res.json()) as { item?: Uploaded; error?: string };
  if (!res.ok || !data.item) throw new Error(`upload failed (${res.status}): ${data.error}`);
  return data.item;
}

/** Files above the per-request limit go up in 50 MB parts (R2 multipart upload). */
async function uploadMultipart(m: MediaEntry, buf: Buffer, ext: string): Promise<Uploaded> {
  const auth = { authorization: `Bearer ${TOKEN}` };
  const existing = await fetch(`${TARGET}/api/import/media/by-source?url=${encodeURIComponent(m.sourceUrl)}`, { headers: auth });
  if (existing.ok) return ((await existing.json()) as { item: Uploaded }).item;
  const filename = m.filename.endsWith(`.${ext}`) ? m.filename : `${m.filename}.${ext}`;
  const create = await fetch(`${TARGET}/api/import/media/multipart/create`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ filename, size: buf.byteLength, sourceUrl: m.sourceUrl }),
  });
  const { id, key, uploadId, error } = (await create.json()) as { id: string; key: string; uploadId: string; error?: string };
  if (!create.ok) throw new Error(`multipart create failed: ${error}`);
  const PART = 50 * 1024 * 1024;
  const parts: { partNumber: number; etag: string }[] = [];
  for (let i = 0, n = 1; i < buf.byteLength; i += PART, n++) {
    const res = await fetch(`${TARGET}/api/import/media/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&part=${n}`, {
      method: "PUT",
      headers: auth,
      body: new Uint8Array(buf.subarray(i, i + PART)),
    });
    if (!res.ok) throw new Error(`part ${n} failed (${res.status})`);
    parts.push((await res.json()) as { partNumber: number; etag: string });
  }
  const done = await fetch(`${TARGET}/api/import/media/multipart/complete`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ id, key, uploadId, filename, alt: m.alt, sourceUrl: m.sourceUrl, parts }),
  });
  const data = (await done.json()) as { item?: Uploaded; error?: string };
  if (!done.ok || !data.item) throw new Error(`multipart complete failed: ${data.error}`);
  return data.item;
}

/** Replace placeholders; strip references to media that couldn't be imported. */
function resolve(value: unknown, map: Map<string, Uploaded>, missing: Set<string>): unknown {
  if (typeof value === "string") {
    const m = value.match(/^wix-media:(.+)$/);
    if (!m) return value;
    const up = map.get(m[1]);
    if (!up) {
      missing.add(m[1]);
      return "__MISSING__";
    }
    return up.url;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolve(v, map, missing)).filter((v) => !(v && typeof v === "object" && "__missing" in (v as object)));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Image reference
    if (typeof obj.src === "string" && obj.src.startsWith("wix-media:")) {
      const up = map.get(obj.src.slice(10));
      if (!up) {
        missing.add(obj.src.slice(10));
        return { __missing: true };
      }
      return {
        ...obj,
        src: up.url,
        mediaId: up.id,
        ...(up.width ? { width: up.width } : {}),
        ...(up.height ? { height: up.height } : {}),
        ...(up.variants.length ? { variants: up.variants.map((v) => ({ w: v.w, src: v.url })) } : {}),
      };
    }
    // File reference
    if (typeof obj.url === "string" && obj.url.startsWith("wix-media:") && !("label" in obj)) {
      const up = map.get(obj.url.slice(10));
      if (!up) {
        missing.add(obj.url.slice(10));
        return { __missing: true };
      }
      return { ...obj, url: up.url, mediaId: up.id, filename: up.filename, size: up.size };
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const r = resolve(v, map, missing);
      if (r && typeof r === "object" && "__missing" in (r as object)) continue; // drop optional image/file fields
      if (r === "__MISSING__") continue;
      out[k] = r;
    }
    // A block whose required media is gone is dropped by the caller
    return out;
  }
  return value;
}

async function postContent(body: unknown) {
  const res = await fetch(`${TARGET}/api/import/content`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { created?: number; updated?: number; skipped?: string[]; errors?: string[]; redirects?: number; error?: string };
  if (!res.ok) throw new Error(`content import failed (${res.status}): ${data.error}`);
  return data;
}

async function main() {
  const media = JSON.parse(readFileSync(path.join(BUNDLE, "media.json"), "utf8")) as MediaEntry[];
  const content = JSON.parse(readFileSync(path.join(BUNDLE, "content.json"), "utf8")) as {
    pages: { path: string; doc: { blocks: { type: string; image?: unknown; images?: unknown[]; videos?: unknown[] }[] } }[];
    entries: unknown[];
    settings: Record<string, unknown>;
    redirects: unknown[];
  };

  console.log(`Uploading ${media.length} media files to ${TARGET} …`);
  const map = new Map<string, Uploaded>();
  const failed: { key: string; url: string; error: string }[] = [];
  let done = 0;
  const queue = [...media];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const m = queue.shift()!;
        try {
          map.set(m.key, await uploadOne(m));
        } catch (e) {
          failed.push({ key: m.key, url: m.download, error: String(e) });
        }
        if (++done % 25 === 0) console.log(`  ${done}/${media.length}`);
      }
    }),
  );
  console.log(`Media: ${map.size} uploaded, ${failed.length} failed`);

  const missing = new Set<string>();
  const pages = content.pages.map((p) => {
    const r = resolve(p, map, missing) as typeof p;
    // drop blocks that lost their essential media
    r.doc.blocks = r.doc.blocks.filter(
      (b) => !(b.type === "image" && !b.image) && !(b.type === "gallery" && !b.images?.length) && !(b.type === "video" && !b.videos?.length),
    );
    return r;
  });
  const entries = resolve(content.entries, map, missing) as unknown[];
  const settings = resolve(content.settings, map, missing) as Record<string, unknown>;

  const results = [];
  results.push(await postContent({ settings, redirects: content.redirects }));
  for (let i = 0; i < pages.length; i += 15) results.push(await postContent({ pages: pages.slice(i, i + 15) }));
  for (let i = 0; i < entries.length; i += 40) results.push(await postContent({ entries: entries.slice(i, i + 40) }));

  const summary = {
    target: TARGET,
    at: new Date().toISOString(),
    media: { total: media.length, uploaded: map.size, failed },
    missingReferences: [...missing],
    created: results.reduce((n, r) => n + (r.created ?? 0), 0),
    updated: results.reduce((n, r) => n + (r.updated ?? 0), 0),
    skipped: results.flatMap((r) => r.skipped ?? []),
    errors: results.flatMap((r) => r.errors ?? []),
    redirects: results[0].redirects,
  };
  writeFileSync(path.join(BUNDLE, "push-report.json"), JSON.stringify(summary, null, 1));
  console.log(
    `Content: ${summary.created} created, ${summary.updated} updated, ${summary.skipped.length} skipped (staff-edited), ${summary.errors.length} errors, ${summary.redirects} redirects`,
  );
  for (const e of summary.errors.slice(0, 20)) console.log("  ERROR", e);
  for (const f of failed.slice(0, 20)) console.log("  MEDIA FAILED", f.key, f.url, f.error);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
