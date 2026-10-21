import type { MediaItem } from "@shared/types";
import { slugify } from "@shared/slug";
import { HttpError } from "../app";
import { parseJson } from "./util";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_DOC_BYTES = 90 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 90 * 1024 * 1024; // Workers Free accepts request bodies up to 100 MB

/** Allowed types, identified by file signature ("magic bytes") — the browser-supplied type is not trusted.
 * SVG and HTML are deliberately excluded: they can carry scripts. */
const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: "image/webp", ext: "webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP" },
  { mime: "image/avif", ext: "avif", test: (b) => ascii(b, 4, 4) === "ftyp" && /^avi[fs]$/.test(ascii(b, 8, 4)) },
  { mime: "application/pdf", ext: "pdf", test: (b) => ascii(b, 0, 5) === "%PDF-" },
  { mime: "video/mp4", ext: "mp4", test: (b) => ascii(b, 4, 4) === "ftyp" && /^(isom|iso2|mp41|mp42|avc1|M4V |dash)$/.test(ascii(b, 8, 4)) },
];

function ascii(b: Uint8Array, start: number, len: number) {
  return String.fromCharCode(...b.slice(start, start + len));
}

export function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
  const s = SIGNATURES.find((sig) => sig.test(bytes));
  return s ? { mime: s.mime, ext: s.ext } : null;
}

export const isImage = (mime: string) => mime.startsWith("image/");

/** Safe, predictable object keys: uploads/2026/10/<id>-<slugified-name>.<ext> — no user-controlled path segments. */
export function makeKey(id: string, filename: string, ext: string, prefix = "uploads"): string {
  const base = slugify(filename.replace(/\.[a-z0-9]+$/i, ""), 60) || "file";
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${id}-${base}.${ext}`;
}

export function cleanFilename(name: string): string {
  return (
    name
      .replace(/[\\/]/g, "_")
      // eslint-disable-next-line no-control-regex -- strip control characters from uploaded file names
      .replace(/[\u0000-\u001f\u007f"<>]/g, "")
      .trim()
      .slice(0, 200) || "file"
  );
}

export type MediaRow = {
  id: string;
  r2_key: string;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  variants_json: string | null;
  created_at: string;
};

export const mediaUrl = (key: string) => `/media/${key}`;

export function toMediaItem(r: MediaRow): MediaItem {
  const variants = parseJson<{ w: number; key: string }[]>(r.variants_json, []);
  return {
    id: r.id,
    url: mediaUrl(r.r2_key),
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    width: r.width,
    height: r.height,
    alt: r.alt,
    createdAt: r.created_at,
    variants: variants.map((v) => ({ w: v.w, url: mediaUrl(v.key) })),
  };
}

/** Read an uploaded File fully (bounded by maxBytes) and validate its real type. */
export async function readUpload(file: File, maxBytes: number, allow: "image" | "any"): Promise<{ bytes: Uint8Array; mime: string; ext: string }> {
  if (file.size > maxBytes) throw new HttpError(413, `That file is too large. The limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new HttpError(415, "That type of file isn't supported. Upload JPG, PNG, WebP, GIF or AVIF images, PDF documents or MP4 videos.");
  if (allow === "image" && !isImage(type.mime)) throw new HttpError(415, "Please choose an image file.");
  if (type.mime === "application/pdf" && bytes.byteLength > MAX_DOC_BYTES) throw new HttpError(413, "That document is too large to upload in one go (90 MB).");
  if (isImage(type.mime) && bytes.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, "That image is too large (15 MB limit).");
  return { bytes, ...type };
}

/** Find pages/entries/settings that reference a media item (blocks deletion of in-use files). */
export async function findMediaUsage(db: D1Database, id: string, key: string) {
  // instr() instead of LIKE: D1 caps LIKE pattern length, and these needles are long paths
  const needleId = `"mediaId":"${id}"`;
  const needleKey = `/media/${key}`;
  const pages = await db
    .prepare(
      "SELECT id, title, path FROM pages WHERE deleted_at IS NULL AND (instr(draft_json, ?1) > 0 OR instr(published_json, ?1) > 0 OR instr(draft_json, ?2) > 0 OR instr(published_json, ?2) > 0) LIMIT 20",
    )
    .bind(needleId, needleKey)
    .all<{ id: string; title: string; path: string }>();
  const entries = await db
    .prepare(
      "SELECT id, title, collection FROM entries WHERE deleted_at IS NULL AND (instr(draft_json, ?1) > 0 OR instr(published_json, ?1) > 0 OR instr(draft_json, ?2) > 0 OR instr(published_json, ?2) > 0) LIMIT 20",
    )
    .bind(needleId, needleKey)
    .all<{ id: string; title: string; collection: string }>();
  const settings = await db
    .prepare("SELECT key FROM settings WHERE instr(value_json, ?1) > 0 OR instr(value_json, ?2) > 0")
    .bind(needleId, needleKey)
    .all<{ key: string }>();
  return {
    pages: pages.results,
    entries: entries.results,
    settings: settings.results.map((s) => s.key),
    total: pages.results.length + entries.results.length + settings.results.length,
  };
}
