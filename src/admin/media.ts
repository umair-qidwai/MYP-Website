/**
 * Browser-side media preparation before upload:
 *  - photos are resized to at most 2400px and re-encoded, which also removes hidden metadata
 *    (e.g. GPS location in phone photos — important for pictures of young people)
 *  - smaller WebP copies (640/1280px) are produced for fast responsive loading
 *  - files over ~85 MB are sent in parts (R2 multipart) to stay under request limits
 */
import type { MediaItem } from "@shared/types";
import { api, uploadWithProgress } from "./api";

export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,video/mp4";
export const MAX_BYTES = 1024 * 1024 * 1024;
const MAX_DIM = 2400;
const VARIANTS = [640, 1280];

function canEncodeWebp(): boolean {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

async function encode(bitmap: ImageBitmap, width: number, type: string, quality: number): Promise<Blob> {
  const height = Math.round((bitmap.height * width) / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process this image."))), type, quality));
}

export type Prepared = { form: FormData; size: number };

export async function prepareImage(file: File, alt: string): Promise<Prepared> {
  const form = new FormData();
  form.append("alt", alt);
  if (file.type === "image/gif" || file.type === "image/avif") {
    // Animated GIFs / AVIF are uploaded untouched
    form.append("file", file, file.name);
    return { form, size: file.size };
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const width = Math.min(MAX_DIM, bitmap.width);
  const mainType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const main = await encode(bitmap, width, mainType, 0.88);
  const ext = mainType.split("/")[1].replace("jpeg", "jpg");
  const name = file.name.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
  form.append("file", main, name);
  form.append("width", String(width));
  form.append("height", String(Math.round((bitmap.height * width) / bitmap.width)));
  const vType = canEncodeWebp() ? "image/webp" : "image/jpeg";
  let size = main.size;
  for (const w of VARIANTS) {
    if (w >= width) continue;
    const v = await encode(bitmap, w, vType, 0.82);
    form.append(`variant_${w}`, v, `${w}.${vType.split("/")[1]}`);
    size += v.size;
  }
  bitmap.close();
  return { form, size };
}

export async function uploadFile(file: File, alt: string, onProgress: (f: number) => void): Promise<MediaItem> {
  if (file.size > MAX_BYTES) throw new Error("That file is larger than 1 GB.");
  if (!ACCEPT.split(",").includes(file.type)) throw new Error(`“${file.name}” isn't a supported type. Use JPG, PNG, WebP, GIF, PDF or MP4.`);
  if (file.type.startsWith("image/")) {
    if (file.size > 40 * 1024 * 1024) throw new Error("That image is very large. Please use a photo under 40 MB.");
    const { form } = await prepareImage(file, alt);
    return (await uploadWithProgress<{ item: MediaItem }>("/api/admin/media", form, onProgress)).item;
  }
  if (file.size <= 85 * 1024 * 1024) {
    const form = new FormData();
    form.append("alt", alt);
    form.append("file", file, file.name);
    return (await uploadWithProgress<{ item: MediaItem }>("/api/admin/media", form, onProgress)).item;
  }
  // Large documents/videos: upload in 50 MB parts
  const { id, key, uploadId } = await api.post<{ id: string; key: string; uploadId: string }>("/api/admin/media/multipart/create", {
    filename: file.name,
    size: file.size,
  });
  const PART = 50 * 1024 * 1024;
  const parts: { partNumber: number; etag: string }[] = [];
  try {
    for (let offset = 0, n = 1; offset < file.size; offset += PART, n++) {
      const chunk = file.slice(offset, offset + PART);
      const r = await uploadWithProgress<{ partNumber: number; etag: string }>(
        `/api/admin/media/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&part=${n}`,
        chunk,
        (f) => onProgress((offset + f * chunk.size) / file.size),
        "PUT",
      );
      parts.push(r);
    }
    return (await api.post<{ item: MediaItem }>("/api/admin/media/multipart/complete", { id, key, uploadId, filename: file.name, alt, parts })).item;
  } catch (e) {
    await api.post("/api/admin/media/multipart/abort", { key, uploadId }).catch(() => {});
    throw e;
  }
}

export const fmtBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Convert a library item into the reference stored in page content. */
export const toImageRef = (m: MediaItem) => ({
  mediaId: m.id,
  src: m.url,
  alt: m.alt,
  ...(m.width ? { width: m.width } : {}),
  ...(m.height ? { height: m.height } : {}),
  ...(m.variants.length ? { variants: m.variants.map((v) => ({ w: v.w, src: v.url })) } : {}),
});
export const toFileRef = (m: MediaItem) => ({ mediaId: m.id, url: m.url, filename: m.filename, size: m.size });
