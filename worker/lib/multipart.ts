/**
 * Chunked uploads to R2 for files larger than one request body (Workers Free: 100 MB per request).
 * The browser/importer sends 50 MB parts; the file type is verified from its first bytes on completion.
 */
import { Hono } from "hono";
import { z } from "zod";
import { HttpError, type AppEnv } from "../app";
import { audit } from "./audit";
import { body } from "./guards";
import { cleanFilename, makeKey, sniff, toMediaItem, type MediaRow } from "./media";
import { newId, nowIso } from "./util";

export const MAX_MULTIPART_BYTES = 1024 * 1024 * 1024; // 1 GB ceiling for a single document/video

export function multipartRoutes(prefix: "uploads" | "imported") {
  const r = new Hono<AppEnv>();

  r.post("/create", async (c) => {
    const input = await body(c.req.raw, z.object({ filename: z.string().max(300), size: z.number().int().positive().max(MAX_MULTIPART_BYTES), sourceUrl: z.string().max(2048).optional() }));
    const ext = (input.filename.match(/\.([a-z0-9]{2,4})$/i)?.[1] ?? "").toLowerCase();
    const mime = { pdf: "application/pdf", mp4: "video/mp4" }[ext];
    if (!mime) throw new HttpError(415, "Large uploads must be PDF documents or MP4 videos.");
    const id = newId("m_");
    const filename = cleanFilename(input.filename);
    const key = makeKey(id, filename, ext, prefix);
    const upload = await c.env.MEDIA.createMultipartUpload(key, {
      httpMetadata: { contentType: mime, contentDisposition: `inline; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"`, cacheControl: "public, max-age=31536000, immutable" },
    });
    return c.json({ id, key, uploadId: upload.uploadId });
  });

  r.put("/part", async (c) => {
    const key = c.req.query("key") ?? "";
    const uploadId = c.req.query("uploadId") ?? "";
    const part = Number(c.req.query("part"));
    if (!/^(uploads|imported)\/\d{4}\/\d{2}\/m_[a-z0-9]+-[a-z0-9-]+\.(pdf|mp4)$/.test(key) || !uploadId || !(part >= 1 && part <= 10000)) throw new HttpError(400, "Invalid upload part.");
    if (!c.req.raw.body) throw new HttpError(400, "Empty part.");
    const up = c.env.MEDIA.resumeMultipartUpload(key, uploadId);
    const res = await up.uploadPart(part, c.req.raw.body);
    return c.json({ partNumber: res.partNumber, etag: res.etag });
  });

  r.post("/complete", async (c) => {
    const input = await body(
      c.req.raw,
      z.object({
        id: z.string().max(64),
        key: z.string().max(400),
        uploadId: z.string().max(1000),
        filename: z.string().max(300),
        alt: z.string().max(400).optional(),
        sourceUrl: z.string().max(2048).optional(),
        parts: z.array(z.object({ partNumber: z.number().int(), etag: z.string().max(200) })).min(1).max(10000),
      }),
    );
    const up = c.env.MEDIA.resumeMultipartUpload(input.key, input.uploadId);
    const obj = await up.complete(input.parts);
    // Verify the real file type from its first bytes
    const head = await c.env.MEDIA.get(input.key, { range: { offset: 0, length: 32 } });
    const type = head ? sniff(new Uint8Array(await head.arrayBuffer())) : null;
    if (!type || !["application/pdf", "video/mp4"].includes(type.mime)) {
      await c.env.MEDIA.delete(input.key);
      throw new HttpError(415, "That file isn't a valid PDF or MP4.");
    }
    const user = c.get("user");
    await c.env.DB.prepare(
      "INSERT INTO media (id, r2_key, filename, mime, size, alt, source_url, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(input.id, input.key, cleanFilename(input.filename), type.mime, obj.size, input.alt ?? "", input.sourceUrl ?? null, user?.id ?? null, nowIso())
      .run();
    if (user) await audit(c.env.DB, user, "media.upload", "media", input.id, input.filename);
    const row = await c.env.DB.prepare("SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE id = ?").bind(input.id).first<MediaRow>();
    return c.json({ item: toMediaItem(row!) }, 201);
  });

  r.post("/abort", async (c) => {
    const input = await body(c.req.raw, z.object({ key: z.string().max(400), uploadId: z.string().max(1000) }));
    await c.env.MEDIA.resumeMultipartUpload(input.key, input.uploadId).abort();
    return c.json({ ok: true });
  });

  return r;
}
