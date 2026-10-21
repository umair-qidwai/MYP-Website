/**
 * Seeds the isolated E2E database with fixture content through the import API, and sets the
 * test accounts' passwords through their one-time links (exercising the real flow).
 */
import { readFileSync } from "node:fs";
import { makePdf, makePng } from "../fixtures/assets";
import { E2E_PASSWORD, FIXTURE } from "./fixture";

const BASE = "http://localhost:5190";
const TOKEN = readFileSync(".dev.vars", "utf8")
  .match(/^IMPORT_TOKEN=(.+)$/m)![1]
  .trim();

type Item = { id: string; url: string; width: number | null; height: number | null; variants: { w: number; url: string }[]; filename: string; size: number };

async function uploadMedia(name: string, buf: Buffer, type: string, w?: number, h?: number): Promise<Item> {
  const fd = new FormData();
  fd.append("sourceUrl", `fixture:${name}`);
  fd.append("filename", name);
  fd.append("alt", `Fixture ${name}`);
  if (w && h) {
    fd.append("width", String(w));
    fd.append("height", String(h));
  }
  fd.append("file", new Blob([new Uint8Array(buf)], { type }), name);
  const r = await fetch(`${BASE}/api/import/media`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: fd });
  if (!r.ok) throw new Error(`media upload failed: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { item: Item }).item;
}

export default async function globalSetup() {
  for (const [token, label] of [
    ["e2e-admin-token-0123456789abcdefghij", "admin"],
    ["e2e-editor-token-0123456789abcdefghi", "editor"],
  ]) {
    const r = await fetch(`${BASE}/api/auth/set-password`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ token, password: E2E_PASSWORD }),
    });
    if (!r.ok) throw new Error(`set-password (${label}) failed: ${r.status} ${await r.text()}`);
  }

  const photo = await uploadMedia("fixture-photo.png", makePng(640, 400, [79, 45, 130]), "image/png", 640, 400);
  const logo = await uploadMedia("fixture-logo.png", makePng(300, 300, [234, 165, 58]), "image/png", 300, 300);
  const pdf = await uploadMedia("fixture-report.pdf", makePdf(), "application/pdf");
  const img = (m: Item, alt: string) => ({ mediaId: m.id, src: m.url, alt, width: m.width ?? undefined, height: m.height ?? undefined });

  const body = FIXTURE({
    photo: img(photo, "Fixture photo of a community event"),
    logo: img(logo, "Fixture initiative logo"),
    pdf: { mediaId: pdf.id, url: pdf.url, filename: pdf.filename, size: pdf.size },
  });
  const r = await fetch(`${BASE}/api/import/content`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const report = (await r.json()) as { errors?: string[] };
  if (!r.ok || report.errors?.length) throw new Error(`fixture import failed: ${JSON.stringify(report)}`);
}
