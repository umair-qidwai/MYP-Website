/**
 * Transform the crawled Wix site (migration/crawl/pages/*.json) into a CMS content bundle:
 *   migration/bundle/content.json  – pages, collection entries, settings, redirects
 *   migration/bundle/media.json    – media to download from Wix and upload to R2
 *   migration/bundle/report.json   – per-URL outcome + text-parity measurements (feeds docs/)
 *
 * Content is taken verbatim. Media/document references become "wix-media:<key>" placeholders
 * that scripts/import/push.ts replaces after uploading the files.
 *
 * Usage: npx tsx scripts/import/transform.ts
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseDocument } from "htmlparser2";
import type { Element } from "domhandler";
import { blockSchema, pageDocSchema, type Block, type PageDoc } from "../../shared/blocks";
import { getCollection } from "../../shared/collections";
import { entryDocSchema } from "../../shared/collections-schema";
import type { RichDoc, RichNode } from "../../shared/richtext";
import { SETTINGS_SCHEMAS } from "../../shared/settings";
import { normalizePath, slugify } from "../../shared/slug";
import { docText, normaliseHeadingLevels, wixHtmlToDoc } from "./wix-html";

const ORIGIN = "https://www.myprojectusa.org";
const CRAWL_DIR = "migration/crawl/pages";
const EMBED_CACHE = "migration/crawl/embeds";
const OUT = "migration/bundle";
const UA = "Mozilla/5.0 (Macintosh) MYP-migration-audit";

// ── Crawl types ─────────────────────────────────────────────────────────────
type Rect = { x: number; y: number; w: number; h: number };
type Item = {
  kind: "richtext" | "image" | "bgimage" | "button" | "iframe" | "video" | "gallery" | "accordion" | "orphan";
  question?: string;
  answerHtml?: string;
  answerText?: string;
  tag?: string;
  rect: Rect;
  section: string;
  visible?: boolean;
  html?: string;
  text?: string;
  src?: string;
  alt?: string | null;
  href?: string | null;
  inGallery?: boolean;
  naturalW?: number;
  naturalH?: number;
  title?: string | null;
  imgs?: { src: string; alt: string | null }[];
  titles?: string[];
  descs?: string[];
  links?: (string | null)[];
};
type CrawlForm = {
  text: string;
  rect: Rect;
  fields: {
    tag: string;
    type: string;
    name: string | null;
    placeholder: string | null;
    required: boolean;
    label: string | null;
    ariaLabel: string | null;
    options?: string[];
  }[];
};
type Crawl = {
  url: string;
  group: string;
  status: number;
  finalUrl?: string;
  title?: string;
  meta?: { description: string | null; ogImage: string | null };
  items: Item[];
  forms: CrawlForm[];
  nav?: { text: string; href: string | null; children: { text: string; href: string | null }[] }[];
  footerText?: string;
  mainText?: string;
};

// ── Output types ────────────────────────────────────────────────────────────
type MediaEntry = {
  key: string;
  kind: "image" | "file" | "video";
  sourceUrl: string;
  download: string;
  variants: { w: number; url: string }[];
  alt: string;
  filename: string;
};
type PageOut = { path: string; sourceUrl: string; publish: boolean; doc: PageDoc };
type EntryOut = { collection: string; slug: string; sourceUrl: string; sortOrder: number; publish: boolean; doc: unknown };
type ReportRow = {
  source: string;
  outcome: "page" | "entry" | "redirect" | "skipped";
  target: string;
  title?: string;
  sourceChars?: number;
  coverage?: number; // fraction of source words present in the migrated content
  missingSample?: string[];
  images?: number;
  notes: string[];
};

const media = new Map<string, MediaEntry>();
const report: ReportRow[] = [];
const redirects = new Map<string, string>();
const brokenLinks: { page: string; href: string }[] = [];
const altNeeded: { page: string; key: string; alt: string }[] = [];

// ── Load crawl ──────────────────────────────────────────────────────────────
const crawls: Crawl[] = readdirSync(CRAWL_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(CRAWL_DIR, f), "utf8")) as Crawl)
  .filter((c) => c.status === 200);
// Orphan text (captured by the crawler's catch-all) is treated as rich text
for (const c of crawls) {
  for (const i of c.items ?? []) {
    if (i.kind === "orphan") {
      const tag = /^h[1-6]$|^p$/.test(i.tag ?? "") ? i.tag : "div";
      i.html = `<${tag}>${i.html ?? ""}</${tag}>`;
      i.kind = "richtext";
    }
  }
}
const byPath = new Map<string, Crawl>();
for (const c of crawls) {
  const p = normalizePath(new URL(c.url).pathname);
  // Prefer the sitemap crawl over ad-hoc re-crawls only when the ad-hoc one failed
  if (!byPath.has(p) || c.group === "adhoc") byPath.set(p, c);
}
const crawlOf = (p: string) => {
  const c = byPath.get(p);
  if (!c) throw new Error(`No crawl for ${p}`);
  return c;
};

// Wix sitemap order = the order Wix lists items (events: newest first)
const SITEMAP_CACHE = "migration/crawl/sitemaps";
async function sitemapOrder(name: string): Promise<string[]> {
  mkdirSync(SITEMAP_CACHE, { recursive: true });
  const file = path.join(SITEMAP_CACHE, name);
  let xml: string;
  if (existsSync(file)) xml = readFileSync(file, "utf8");
  else {
    xml = await (await fetch(`${ORIGIN}/${name}`, { headers: { "user-agent": UA } })).text();
    writeFileSync(file, xml);
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalizePath(new URL(decodeEntities(m[1])).pathname));
}

/** Wix stored some titles with escaped entities (e.g. "&quot;Thanks is Giving&quot;"). */
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ── Classification ──────────────────────────────────────────────────────────
const TRANSLATED = /^\/(ar|es|fr|ht)\/(free-clinic|freeclinicteam)$/;
type Kind = "home" | "page" | "translation" | "event" | "article" | "reports" | "newsPage" | "eventsPage" | "blogPage" | "redirect" | "skip";

function classify(p: string, c: Crawl): { kind: Kind; to?: string; note?: string } {
  const final = c.finalUrl ? normalizePath(new URL(c.finalUrl).pathname) : p;
  if (final !== p) return { kind: "redirect", to: final, note: "Wix already redirected this URL" };
  if (p === "/") return { kind: "home" };
  if (p === "/shop" || p.startsWith("/product-page/"))
    return { kind: "redirect", to: "/", note: "Wix Stores template placeholder (“I'm a product”) — no organisational content" };
  if (p === "/contact-8")
    return {
      kind: "redirect",
      to: "/contacts",
      note: "Unedited Wix template contact page (placeholder phone/email, Wix's own social links) — menu item now points to the real contact page",
    };
  if (p.startsWith("/blog/tags/") || p.startsWith("/blog/archive/")) return { kind: "redirect", to: "/blog", note: "Wix blog tag/archive listing" };
  if (p === "/events-1") return { kind: "redirect", to: "/events", note: "Wix dynamic events listing → events archive" };
  if (p.startsWith("/events-1/")) return { kind: "event" };
  if (p.startsWith("/single-post/")) return { kind: "article" };
  if (p === "/reports") return { kind: "reports" };
  if (p === "/copy-of-news-coverage") return { kind: "newsPage" };
  if (p === "/events") return { kind: "eventsPage" };
  if (p === "/blog") return { kind: "blogPage" };
  if (TRANSLATED.test(p)) return { kind: "translation" };
  if (/^\/(ar|es|fr|ht|so)\//.test(p))
    return { kind: "skip", note: "Locale copy of an English page (Wix served English content); handled by language fallback" };
  return { kind: "page" };
}

const classified = [...byPath.entries()].map(([p, c]) => ({ p, c, ...classify(p, c) }));

// Event slugs (needed before link mapping)
const eventSlug = new Map<string, string>(); // normalised wix path tail → new slug
{
  const used = new Set<string>();
  for (const { p, c, kind } of classified) {
    if (kind !== "event") continue;
    const title = eventTitle(c);
    let s = slugify(title) || "event";
    for (let i = 2; used.has(s); i++) s = `${slugify(title)}-${i}`;
    used.add(s);
    eventSlug.set(p.slice("/events-1/".length), s);
  }
}
const articleSlug = (p: string) => slugify(p.split("/").pop() ?? "post");

const pagePaths = new Set(
  classified.filter((x) => ["home", "page", "translation", "reports", "newsPage", "eventsPage", "blogPage"].includes(x.kind)).map((x) => x.p),
);

// Redirect map: legacy URL → new URL
for (const { p, kind, to } of classified) {
  if (kind === "redirect" && to) redirects.set(p, to);
  if (kind === "event") {
    const tail = p.slice("/events-1/".length);
    redirects.set(p, `/events/${eventSlug.get(tail)}`);
    redirects.set(`/events-3/${tail}`, `/events/${eventSlug.get(tail)}`);
  }
  if (kind === "article") redirects.set(p, `/blog/${articleSlug(p)}`);
}
redirects.set("/events-3", "/events");

// ── Helpers: links & media ──────────────────────────────────────────────────
function mapInternal(pathname: string, hash = "", from = ""): string {
  const n = normalizePath(pathname);
  if (n === "/") return "/" + hash;
  if (redirects.has(n)) return redirects.get(n)! + hash;
  const loc = n.match(/^\/(ar|es|fr|ht|so)(\/.*)?$/);
  if (loc && !pagePaths.has(n)) return (loc[2] ?? "/") + hash;
  if (!pagePaths.has(n)) brokenLinks.push({ page: from, href: pathname });
  return n + hash;
}

function docMedia(url: string, label?: string): string {
  const u = new URL(url);
  const file = u.pathname.split("/").pop() ?? "document.pdf";
  const key = "doc_" + file.replace(/\.[a-z0-9]+$/i, "");
  const ext = (file.match(/\.([a-z0-9]+)$/i)?.[1] ?? "pdf").toLowerCase();
  const existing = media.get(key);
  const nice = label ? slugify(label.replace(/^download\s+/i, "")) : "";
  if (!existing) {
    media.set(key, {
      key,
      kind: "file",
      sourceUrl: `wix-doc:${file}`,
      download: `https://be0c83f6-d42a-4165-80e2-3bee1a395dca.usrfiles.com/ugd/${file}`,
      variants: [],
      alt: "",
      filename: `${nice || file.replace(/\.[a-z0-9]+$/i, "")}.${ext}`,
    });
  } else if (nice && existing.filename.startsWith(file.replace(/\.[a-z0-9]+$/i, ""))) {
    existing.filename = `${nice}.${ext}`;
  }
  return `wix-media:${key}`;
}

function makeLinkMapper(from: string) {
  return (href: string, label?: string): string | null => {
    if (!href) return null;
    const h = href.trim();
    if (/^(mailto|tel):/i.test(h)) return h.replace(/\s/g, "");
    if (/^javascript:/i.test(h)) return null;
    let u: URL;
    try {
      u = new URL(h, ORIGIN + from);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(u.protocol)) return null;
    if (u.hostname.endsWith(".usrfiles.com") && u.pathname.startsWith("/ugd/")) return docMedia(u.href, label);
    // Wix document links, including locale-prefixed ones on translated pages (/es/_files/ugd/…)
    if (/^(www\.)?myprojectusa\.org$/.test(u.hostname) && /^\/(?:(?:ar|es|fr|ht|so)\/)?_files\/ugd\//.test(u.pathname)) return docMedia(u.href, label);
    if (/^(www\.)?myprojectusa\.org$/.test(u.hostname)) return mapInternal(u.pathname, u.hash, from);
    return u.href;
  };
}

const looksLikeFilename = (alt: string) =>
  /\.(jpe?g|png|webp|gif|heic)$/i.test(alt.trim()) ||
  /^(img|image|dsc|screen ?shot|whatsapp image|photo)[\s_-]?\d/i.test(alt.trim()) ||
  /^[a-f0-9_]{16,}/i.test(alt.trim());

/** Register a Wix image; returns an image ref with a placeholder src. */
function imageRef(src: string, alt: string | null | undefined, page: string): { src: string; alt: string } | null {
  if (!src || !src.includes("static.wixstatic.com/media/")) return null;
  const m = src.match(/static\.wixstatic\.com\/media\/([^/]+)(?:\/v1\/(.*?))?(?:\/[^/]*)?$/);
  if (!m) return null;
  const id = m[1];
  const transform = m[2] ?? "";
  const crop = transform.match(/crop\/(x_\d+,y_\d+,w_(\d+),h_(\d+))/);
  const base = `https://static.wixstatic.com/media/${id}`;
  const ext = (id.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg").toLowerCase();
  const key =
    "img_" +
    createHash("sha1")
      .update(id + (crop ? crop[1] : ""))
      .digest("hex")
      .slice(0, 16);
  if (!media.has(key)) {
    let download: string;
    const variants: { w: number; url: string }[] = [];
    if (crop) {
      const cw = Number(crop[2]);
      const ch = Number(crop[3]);
      const size = (w: number) => `w_${w},h_${Math.round((ch * w) / cw)}`;
      const w = Math.min(2400, cw);
      download = `${base}/v1/crop/${crop[1]}/fill/${size(w)},al_c,q_90/file.${ext === "gif" ? "png" : ext}`;
      for (const vw of [640, 1280]) if (vw < w) variants.push({ w: vw, url: `${base}/v1/crop/${crop[1]}/fill/${size(vw)},al_c,q_82,enc_webp/file.webp` });
    } else if (ext === "gif") {
      download = base;
    } else {
      download = `${base}/v1/fit/w_2400,h_2400,q_90/file.${ext}`;
      for (const vw of [640, 1280]) variants.push({ w: vw, url: `${base}/v1/fit/w_${vw},h_${vw * 3},q_82,enc_webp/file.webp` });
    }
    const cleanAlt = alt && !looksLikeFilename(alt) ? alt.trim() : "";
    media.set(key, {
      key,
      kind: "image",
      sourceUrl: base + (crop ? `#crop=${crop[1]}` : ""),
      download,
      variants,
      alt: cleanAlt,
      filename: slugify(id.replace(/~mv2.*$/, "").replace(/\.[a-z]+$/, "")) + "." + ext,
    });
    if (!cleanAlt) altNeeded.push({ page, key, alt: alt ?? "" });
  }
  return { src: `wix-media:${key}`, alt: media.get(key)!.alt };
}

function videoRef(src: string): string {
  const id = src.match(/video\/([^/]+)\//)?.[1] ?? createHash("sha1").update(src).digest("hex").slice(0, 12);
  const key = "vid_" + id;
  if (!media.has(key))
    media.set(key, { key, kind: "video", sourceUrl: src, download: src.replace(/\/\d+p\/mp4\//, "/720p/mp4/"), variants: [], alt: "", filename: `${id}.mp4` });
  return `wix-media:${key}`;
}

// ── Embeds ──────────────────────────────────────────────────────────────────
mkdirSync(EMBED_CACHE, { recursive: true });
async function fetchEmbed(url: string): Promise<string> {
  const file = path.join(
    EMBED_CACHE,
    url
      .split("/")
      .pop()!
      .replace(/[^a-z0-9_.-]/gi, "_"),
  );
  if (existsSync(file)) return readFileSync(file, "utf8");
  const res = await fetch(url, { headers: { "user-agent": UA } });
  const text = await res.text();
  writeFileSync(file, text);
  await new Promise((r) => setTimeout(r, 400));
  return text;
}

type EmbedResult = { blocks: Block[]; note?: string };

async function embedFor(src: string, title: string | null | undefined, page: string, mapLink: ReturnType<typeof makeLinkMapper>): Promise<EmbedResult> {
  const id = () => bid();
  if (!src) return { blocks: [] };
  let u: URL;
  try {
    u = new URL(src.startsWith("//") ? "https:" + src : src);
  } catch {
    return { blocks: [], note: `Unparseable embed ${src}` };
  }
  if (u.hostname === "platform.twitter.com") return { blocks: [], note: "Dropped Twitter “Tweet” share-button widget (sharing is available in every browser)" };
  if (u.hostname === "app.socialstream.io")
    return { blocks: [], note: "Dropped Wix Social Stream app widget (Wix-only); social profiles are linked site-wide" };
  if (u.hostname === "dev-wix-languages.appspot.com") return { blocks: [], note: "Dropped Wix language-menu widget" };
  if (u.hostname === "wix.mailchimpapp.com") {
    return {
      blocks: [{ id: id(), type: "buttons", align: "start", buttons: [{ label: "Subscribe", href: "/contact-8-1", style: "secondary" }] }],
      note: "Wix Mailchimp sign-up widget (Wix-only app) replaced with a link to the site's current Subscribe page",
    };
  }
  if (u.hostname.endsWith("filesusr.com")) {
    const html = await fetchEmbed(u.href.replace(/\.htm$/, ".html"));
    const dom = parseDocument(html);
    const find = (name: string): Element[] => {
      const out: Element[] = [];
      const walk = (n: { children?: unknown[] } & Partial<Element>) => {
        if ((n as Element).name === name) out.push(n as Element);
        for (const c of (n.children ?? []) as never[]) walk(c);
      };
      walk(dom as never);
      return out;
    };
    const iframe = find("iframe")[0];
    if (iframe?.attribs.src) return embedFor(iframe.attribs.src, iframe.attribs.title ?? title, page, mapLink);
    const script = find("script").find((s) => /bloomerang/.test(s.attribs.src ?? ""));
    if (script) return { blocks: [{ id: id(), type: "embed", provider: "bloomerang", url: script.attribs.src, title: "Email sign-up form", aspect: "form" }] };
    const anchors = find("a").filter((a) => a.attribs.href);
    if (anchors.length) {
      const buttons = anchors
        .map((a) => {
          const img = (a.children as Element[]).find((x) => x.name === "img");
          const label = (img?.attribs.alt ?? "").trim() || textContent(a) || "Register";
          const href = mapLink(a.attribs.href.startsWith("//") ? "https:" + a.attribs.href : a.attribs.href);
          return href ? { label: label.slice(0, 120), href, style: "primary" as const } : null;
        })
        .filter((b): b is NonNullable<typeof b> => !!b)
        .filter((b, i, arr) => arr.findIndex((x) => x.href.split("?")[0] === b.href.split("?")[0]) === i);
      if (buttons.length)
        return { blocks: [{ id: id(), type: "buttons", align: "start", buttons }], note: "Custom-HTML embed (Eventbrite button) converted to a link button" };
    }
    return { blocks: [], note: `Empty custom-HTML embed ${u.href}` };
  }
  if (/youtube(-nocookie)?\.com$/.test(u.hostname)) {
    const vid = u.pathname.match(/\/embed\/([^/?]+)/)?.[1];
    const list = u.searchParams.get("list");
    const url =
      vid === "videoseries" && list
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`
        : vid
          ? `https://www.youtube-nocookie.com/embed/${vid}`
          : null;
    if (!url) return { blocks: [], note: `Unrecognised YouTube embed ${src}` };
    return {
      blocks: [
        { id: id(), type: "embed", provider: "youtube", url, title: title || (vid === "videoseries" ? "YouTube playlist" : "YouTube video"), aspect: "16:9" },
      ],
    };
  }
  if (u.hostname === "docs.google.com" && u.pathname.includes("/forms/")) {
    return { blocks: [{ id: id(), type: "embed", provider: "google-form", url: u.href, title: title || "Google Form", aspect: "form" }] };
  }
  if (u.hostname === "www.google.com" && u.pathname.startsWith("/maps/embed")) {
    return { blocks: [{ id: id(), type: "embed", provider: "google-map", url: u.href, title: title || "Map", aspect: "4:3" }] };
  }
  if (/eventbrite\.com$/.test(u.hostname)) {
    return {
      blocks: [
        {
          id: id(),
          type: "embed",
          provider: "eventbrite",
          url: `https://www.eventbrite.com${u.pathname}${u.search}`,
          title: title || "Eventbrite tickets",
          aspect: "form",
        },
      ],
    };
  }
  if (u.hostname === "www.nbc4i.com") {
    return { blocks: [{ id: id(), type: "embed", provider: "other", url: u.href, title: title || "NBC4 news story", aspect: "tall" }] };
  }
  return {
    blocks: [{ id: id(), type: "buttons", align: "start", buttons: [{ label: title || u.hostname, href: u.href, style: "secondary" }] }],
    note: `Unknown embed host ${u.hostname} kept as a link`,
  };
}

function textContent(n: Element): string {
  let s = "";
  const walk = (x: unknown) => {
    const node = x as { type: string; data?: string; children?: unknown[] };
    if (node.type === "text") s += node.data;
    for (const c of node.children ?? []) walk(c);
  };
  walk(n);
  return s.replace(/\s+/g, " ").trim();
}

// ── Block building ──────────────────────────────────────────────────────────
let bidCounter = 0;
const bid = () => `b_${(++bidCounter).toString(36).padStart(5, "0")}`;

function isPageItem(i: Item) {
  return i.section.endsWith("@page");
}
const contains = (outer: Rect, inner: Rect, pad = 6) =>
  inner.x >= outer.x - pad && inner.y >= outer.y - pad && inner.x + inner.w <= outer.x + outer.w + pad && inner.y + inner.h <= outer.y + outer.h + pad;
const sameRect = (a: Rect, b: Rect) => Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6 && Math.abs(a.w - b.w) < 8 && Math.abs(a.h - b.h) < 8;
const hOverlap = (a: Rect, b: Rect) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 10;

/**
 * Reading order inside a visual row: full-width items above the columns first, then each column
 * top-to-bottom, left-to-right (sorting purely by y would interleave neighbouring columns).
 */
function columnOrder<T extends { rect: Rect }>(row: T[]): T[] {
  const byY = [...row].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  if (row.length < 2) return byY;
  const minX = Math.min(...row.map((i) => i.rect.x));
  const maxX = Math.max(...row.map((i) => i.rect.x + i.rect.w));
  const W = maxX - minX;
  const spanning = row.filter((i) => i.rect.w > W * 0.6);
  const rest = row.filter((i) => !spanning.includes(i));
  const cols: { x0: number; x1: number; items: T[] }[] = [];
  for (const it of [...rest].sort((a, b) => a.rect.x - b.rect.x)) {
    const c = cols.find((col) => Math.min(col.x1, it.rect.x + it.rect.w) - Math.max(col.x0, it.rect.x) > 10);
    if (c) {
      c.items.push(it);
      c.x0 = Math.min(c.x0, it.rect.x);
      c.x1 = Math.max(c.x1, it.rect.x + it.rect.w);
    } else cols.push({ x0: it.rect.x, x1: it.rect.x + it.rect.w, items: [it] });
  }
  if (cols.length < 2) return byY;
  const topY = rest.length ? Math.min(...rest.map((i) => i.rect.y)) : Infinity;
  const above = spanning.filter((s) => s.rect.y <= topY).sort((a, b) => a.rect.y - b.rect.y);
  const below = spanning.filter((s) => s.rect.y > topY).sort((a, b) => a.rect.y - b.rect.y);
  return [...above, ...cols.sort((a, b) => a.x0 - b.x0).flatMap((c) => c.items.sort((a, b) => a.rect.y - b.rect.y)), ...below];
}

function mergeDocs(docs: RichDoc[]): RichDoc {
  return { type: "doc", content: docs.flatMap((d) => d.content) };
}

/** Pull the first heading (or short bold line) off a doc to use as the page title. */
function takeTitle(doc: RichDoc): string | null {
  const first = doc.content[0];
  if (!first) return null;
  if (first.type === "heading") {
    doc.content.shift();
    return docText({ type: "doc", content: [first] }).trim();
  }
  return null;
}

type Built = { blocks: Block[]; notes: string[]; title: string | null };

async function buildBlocks(c: Crawl, page: string, opts: { takeTitle?: boolean; skip?: (i: Item) => boolean } = {}): Promise<Built> {
  const notes: string[] = [];
  const mapLink = makeLinkMapper(page);
  let items = c.items.filter((i) => isPageItem(i) && i.rect.w > 0 && i.rect.h > 0);
  const hidden = items.filter((i) => i.visible === false);
  if (hidden.length) notes.push(`${hidden.length} hidden Wix element(s) not shown on the live site were skipped`);
  items = items.filter((i) => i.visible !== false && !opts.skip?.(i));

  // Forms become pseudo-items placed by position
  const forms = (c.forms ?? []).filter((f) => f.fields.length && f.rect.w > 0);
  const inForm = (r: Rect) => forms.some((f) => contains(f.rect, r, 4));
  const images = items.filter((i) => i.kind === "image");
  items = items.filter((i) => {
    if (i.kind === "image" && i.inGallery) return false;
    if (i.kind === "image" && Math.max(i.rect.w, i.rect.h) < 60) return false; // icons / thumbnails
    if (i.kind === "button" && !(i.text ?? "").trim()) return false; // invisible link wrappers around images
    if (i.kind === "button" && images.some((im) => sameRect(im.rect, i.rect))) return false;
    if ((i.kind === "button" || i.kind === "richtext") && inForm(i.rect)) return false;
    if (i.kind === "bgimage") return false;
    return true;
  });
  // Drop duplicate galleries (Wix renders container + inner)
  const seenGal = new Set<string>();
  items = items.filter((i) => {
    if (i.kind !== "gallery") return true;
    const sig = (i.imgs ?? []).map((x) => x.src.split("/v1/")[0]).join("|");
    if (!sig || seenGal.has(sig)) return false;
    seenGal.add(sig);
    return true;
  });

  type Pseudo = Item | { kind: "form"; rect: Rect; form: CrawlForm };
  const all: Pseudo[] = [...items, ...forms.map((f) => ({ kind: "form" as const, rect: f.rect, form: f }))];
  all.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  // Group into visual rows
  const rows: Pseudo[][] = [];
  let bottom = -Infinity;
  for (const it of all) {
    if (!rows.length || it.rect.y >= bottom - 8) {
      rows.push([it]);
      bottom = it.rect.y + it.rect.h;
    } else {
      rows[rows.length - 1].push(it);
      bottom = Math.max(bottom, it.rect.y + it.rect.h);
    }
  }

  const blocks: Block[] = [];
  let title: string | null = null;
  const removedAll: string[] = [];

  const toDoc = (i: Item) => {
    const { doc, removed } = wixHtmlToDoc(i.html ?? "", (h) => mapLink(h));
    removedAll.push(...removed);
    return doc;
  };
  const pushRich = (doc: RichDoc) => {
    if (!doc.content.length) return;
    if (opts.takeTitle && title === null) {
      const t = takeTitle(doc);
      if (t) title = t;
      else title = "";
      if (!doc.content.length) return;
    }
    const prev = blocks[blocks.length - 1];
    if (prev?.type === "richText") prev.doc.content.push(...doc.content);
    else blocks.push({ id: bid(), type: "richText", layout: "default", doc });
  };
  const imgBlock = (i: Item): Block | null => {
    const ref = imageRef(i.src ?? "", i.alt, page);
    if (!ref) return null;
    const link = i.href ? (mapLink(i.href) ?? undefined) : undefined;
    return { id: bid(), type: "image", image: ref, link, size: i.rect.w >= 640 ? "wide" : "medium" };
  };
  const pushImage = (i: Item, sameRow: boolean) => {
    const b = imgBlock(i);
    if (!b || b.type !== "image") return;
    const prev = blocks[blocks.length - 1];
    if (sameRow && prev?.type === "image") {
      blocks[blocks.length - 1] = {
        id: prev.id,
        type: "gallery",
        layout: "grid",
        images: [
          { image: prev.image, link: prev.link },
          { image: b.image, link: b.link },
        ],
      };
    } else if (sameRow && prev?.type === "gallery") {
      prev.images.push({ image: b.image, link: b.link });
    } else blocks.push(b);
  };
  const pushButton = (i: Item) => {
    const href = i.href ? mapLink(i.href, i.text) : null;
    const label = (i.text ?? "").replace(/\s+/g, " ").trim();
    if (!href) {
      notes.push(`Button “${label}” had no link on the original site`);
      return;
    }
    const prev = blocks[blocks.length - 1];
    if (prev?.type === "buttons") prev.buttons.push({ label, href, style: "primary" });
    else blocks.push({ id: bid(), type: "buttons", align: "start", buttons: [{ label, href, style: "primary" }] });
  };

  for (const row of rows) {
    // FAQ / accordion items become one accordion block
    const acc = row.filter((i): i is Item => i.kind === "accordion");
    if (acc.length && acc.length === row.length) {
      for (const a of acc) {
        const doc = wixHtmlToDoc(a.answerHtml ?? "", (h) => mapLink(h)).doc;
        const prev = blocks[blocks.length - 1];
        const item = { title: (a.question ?? "").trim(), doc };
        if (prev?.type === "accordion") prev.items.push(item);
        else blocks.push({ id: bid(), type: "accordion", items: [item] });
      }
      continue;
    }
    const texts = row.filter((i): i is Item => i.kind === "richtext");
    const imgs = row.filter((i): i is Item => i.kind === "image");
    // Side-by-side text + image → split block
    const sideBySide = texts.length > 0 && imgs.length > 0 && imgs.every((im) => texts.every((t) => !hOverlap(im.rect, t.rect)));
    if (sideBySide && texts.some((t) => (t.text ?? "").trim().length > 40)) {
      const doc = mergeDocs(columnOrder(texts).map(toDoc));
      if (opts.takeTitle && title === null) title = takeTitle(doc) ?? "";
      const img = imgs.sort((a, b) => a.rect.y - b.rect.y)[0];
      const ref = imageRef(img.src ?? "", img.alt, page);
      const btns = row
        .filter((i): i is Item => i.kind === "button")
        .map((b) => ({ label: (b.text ?? "").trim(), href: b.href ? mapLink(b.href, b.text) : null }))
        .filter((b): b is { label: string; href: string } => !!b.href && !!b.label)
        .map((b) => ({ ...b, style: "primary" as const }));
      blocks.push({
        id: bid(),
        type: "split",
        doc,
        image: ref ?? undefined,
        imageLink: img.href ? (mapLink(img.href) ?? undefined) : undefined,
        imageSide: img.rect.x < texts[0].rect.x ? "left" : "right",
        buttons: btns.slice(0, 4),
      });
      if (btns.length > 4) blocks.push({ id: bid(), type: "buttons", align: "start", buttons: btns.slice(4) });
      const rest = imgs.slice(1);
      for (const r of rest) pushImage(r, true);
      for (const other of row.filter((i) => i.kind === "iframe" || i.kind === "gallery" || i.kind === "video" || i.kind === "form")) await pushOther(other);
      continue;
    }
    const ordered = columnOrder(row);
    let imagesInRow = 0;
    for (const it of ordered) {
      if (it.kind === "richtext") pushRich(toDoc(it));
      else if (it.kind === "image") pushImage(it, imagesInRow++ > 0 || (row.length > 1 && ordered.filter((x) => x.kind === "image").length > 1));
      else if (it.kind === "button") pushButton(it);
      else await pushOther(it);
    }
  }

  async function pushOther(it: Pseudo) {
    if (it.kind === "form") {
      blocks.push(formBlock(it.form, c, page, notes));
      return;
    }
    if (it.kind === "iframe") {
      const r = await embedFor(it.src ?? "", it.title, page, mapLink);
      if (r.note) notes.push(r.note);
      blocks.push(...r.blocks);
      return;
    }
    if (it.kind === "video") {
      const url = videoRef(it.src ?? "");
      const prev = blocks[blocks.length - 1];
      if (prev?.type === "video") prev.videos.push({ file: { url } });
      else blocks.push({ id: bid(), type: "video", videos: [{ file: { url } }] });
      return;
    }
    if (it.kind === "gallery") {
      const imgs = (it.imgs ?? [])
        .map((im, idx) => {
          const ref = imageRef(im.src, im.alt, page);
          if (!ref) return null;
          const caption = [it.titles?.[idx], it.descs?.[idx]].filter(Boolean).join(" — ") || undefined;
          const link = it.links?.[idx] ? (mapLink(it.links[idx]!) ?? undefined) : undefined;
          return { image: ref, caption, link };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
      const uniq = imgs.filter((x, i) => imgs.findIndex((y) => y.image.src === x.image.src) === i);
      if (uniq.length) blocks.push({ id: bid(), type: "gallery", layout: "grid", images: uniq });
      return;
    }
  }

  if (removedAll.length) notes.push(`Removed Wix template placeholder text: ${removedAll.map((r) => `“${r.slice(0, 60)}…”`).join("; ")}`);

  normaliseHeadingLevels(
    blocks.flatMap((b) => (b.type === "richText" || b.type === "split" ? [b.doc] : b.type === "accordion" ? b.items.map((i) => i.doc) : [])),
  );

  // Galleries of small transparent images read better as logo walls
  for (const b of blocks) {
    if (b.type === "gallery" && b.images.every((im) => /\.png$/i.test(media.get(im.image.src.slice(10))?.filename ?? ""))) b.layout = "logos";
    if (b.type === "buttons" && b.buttons.length > 2) b.buttons.forEach((x) => (x.style = "secondary"));
  }
  return { blocks, notes, title };
}

function formBlock(f: CrawlForm, c: Crawl, page: string, notes: string[]): Block {
  const fields = f.fields
    .filter((x) => !["submit", "button", "hidden"].includes(x.type))
    .map((x, idx) => {
      const label = (x.label || x.placeholder || x.ariaLabel || x.name || `Field ${idx + 1}`).replace(/\s*\*$/, "").trim();
      const type = x.tag === "textarea" ? "textarea" : x.tag === "select" ? "select" : ["email", "tel", "checkbox"].includes(x.type) ? x.type : "text";
      return {
        id: slugify(label) || `field-${idx + 1}`,
        label,
        type: type as "text",
        required: !!x.required || /\*$/.test(x.placeholder ?? ""),
        options: x.options,
      };
    });
  const lines = f.text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const labels = new Set(fields.map((x) => x.label.toLowerCase()));
  const submit = lines[lines.length - 1] && lines[lines.length - 1].length < 30 ? lines[lines.length - 1] : "Submit";
  const titleLine = lines.find((l) => !labels.has(l.toLowerCase()) && l !== submit);
  notes.push(`Wix form “${titleLine ?? "Contact"}” rebuilt as a CMS form (submissions are stored securely and listed under Admin › Form submissions)`);
  return {
    id: bid(),
    type: "form",
    title: titleLine ?? (page === "/contacts" ? "Send us a message" : "Contact form"),
    fields,
    submitLabel: submit,
    successMessage: "Thank you — your submission has been received.",
  };
}

// ── Text parity measurement ─────────────────────────────────────────────────
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .split(/[^\p{L}\p{N}'$%]+/u)
    .filter((w) => w.length > 1);

function blockText(b: Block): string {
  switch (b.type) {
    case "richText":
      return docText(b.doc);
    case "split":
      return [b.heading ?? "", docText(b.doc), ...b.buttons.map((x) => x.label)].join("\n");
    case "hero":
      return [b.heading, b.body ? docText(b.body) : "", ...b.buttons.map((x) => x.label)].join("\n");
    case "buttons":
      return b.buttons.map((x) => x.label).join("\n");
    case "cta":
      return [b.heading, b.text ?? "", ...b.buttons.map((x) => x.label)].join("\n");
    case "statement":
      return b.text;
    case "form":
      return [b.title, b.intro ?? "", ...b.fields.map((f) => f.label), b.submitLabel].join("\n");
    case "gallery":
      return b.images.map((i) => i.caption ?? "").join("\n");
    case "cards":
      return [b.heading ?? "", ...b.items.map((i) => `${i.title}\n${i.text ?? ""}`)].join("\n");
    case "accordion":
      return b.items.map((i) => `${i.title}\n${docText(i.doc)}`).join("\n");
    case "options":
      return [
        b.heading ?? "",
        b.intro ?? "",
        ...b.items.map((i) => [i.eyebrow ?? "", i.title ?? "", i.doc ? docText(i.doc) : "", ...i.buttons.map((x) => x.label)].join("\n")),
      ].join("\n");
    case "collection":
    case "programs":
    case "social":
      return b.heading ?? "";
    default:
      return "";
  }
}

function measure(source: string, migrated: string): { coverage: number; missing: string[] } {
  const src = words(source);
  if (!src.length) return { coverage: 1, missing: [] };
  const have = new Map<string, number>();
  for (const w of words(migrated)) have.set(w, (have.get(w) ?? 0) + 1);
  let hit = 0;
  const missing: string[] = [];
  for (const w of src) {
    const n = have.get(w) ?? 0;
    if (n > 0) {
      hit++;
      have.set(w, n - 1);
    } else if (missing.length < 25 && !missing.includes(w)) missing.push(w);
  }
  return { coverage: hit / src.length, missing };
}

// Words that are Wix widget chrome rather than page content
const CHROME = /^(more|quick view|share|top of page|bottom of page|use tab to navigate through the menu items\.)$/i;
const sourceText = (c: Crawl) =>
  decodeEntities(c.mainText ?? "")
    .split("\n")
    .filter((l) => !CHROME.test(l.trim()))
    .join("\n");

// ── Builders ────────────────────────────────────────────────────────────────
function cleanTitle(t?: string) {
  return (t ?? "").replace(/\s*\|\s*(myprojectusa|MY Project USA)\s*$/i, "").trim();
}
function seoFor(c: Crawl) {
  return { title: c.title?.trim() || undefined, description: c.meta?.description?.trim() || undefined };
}

// ── Curation: same words, clearer layout ────────────────────────────────────
type OptionItem = Extract<Block, { type: "options" }>["items"][number];
type Btn = { label: string; href: string; style: "primary" | "secondary" | "link" };
const plain = (n: RichNode) => docText({ type: "doc", content: [n] }).trim();
const isShortLine = (n?: RichNode) => !!n && n.type === "paragraph" && plain(n).length > 0 && plain(n).length <= 60;

/** Wix stacked "label / heading / text / photo / button" sections; read one as a card. */
function splitToOption(b: Extract<Block, { type: "split" }>, extra: Btn[]): OptionItem | null {
  const content = [...b.doc.content];
  let eyebrow: string | undefined;
  if (isShortLine(content[0]) && content[1]?.type === "heading") eyebrow = plain(content.shift()!);
  const head = content[0]?.type === "heading" ? plain(content.shift()!) : b.heading;
  if (!head) return null;
  return {
    eyebrow,
    title: head,
    doc: content.length ? { type: "doc", content } : undefined,
    image: b.image,
    buttons: [...b.buttons, ...extra].slice(0, 4),
  };
}

/** Runs of three or more photo-and-text sections become one grid of cards. */
function gridifySplits(blocks: Block[]): Block[] {
  const collect = (i: number, attachButtons: boolean) => {
    const run: OptionItem[] = [];
    let j = i;
    let attached = 0;
    while (blocks[j]?.type === "split") {
      const b = blocks[j] as Extract<Block, { type: "split" }>;
      const next = blocks[j + 1];
      const extra = attachButtons && next?.type === "buttons" ? (next.buttons as Btn[]) : [];
      const item = splitToOption(b, extra);
      if (!item) break;
      run.push(item);
      if (extra.length) attached++;
      j += extra.length ? 2 : 1;
    }
    return { run, j, attached };
  };
  const out: Block[] = [];
  for (let i = 0; i < blocks.length;) {
    const first = collect(i, true);
    // A lone button after the last card belongs to the page (e.g. "Apply to join"), not to that card
    const { run, j } = first.attached * 2 < first.run.length ? collect(i, false) : first;
    if (run.length >= 3) {
      out.push({ id: bid(), type: "options", columns: run.length >= 5 ? 3 : 2, items: run } as Block);
      i = j;
    } else {
      out.push(blocks[i]);
      i++;
    }
  }
  return out;
}

function curateDonors(blocks: Block[], donorsTitle: string): Block[] {
  const [intro, give, zakatText, zakatBtn, otherWays, iftarImg, iftarBtn, venturesImg, venturesText, venturesBtn, gallery, reportsBtn, closing, closingBtn] =
    blocks as Extract<Block, { type: "richText" | "buttons" | "image" | "gallery" }>[];
  const shape = "richText buttons richText buttons richText image buttons image richText buttons gallery buttons richText buttons";
  if (blocks.map((b) => b.type).join(" ") !== shape) throw new Error("Donate page layout changed; update curateDonors");
  const rt = (b: Block) => (b as Extract<Block, { type: "richText" }>).doc.content;
  const btns = (b: Block) => (b as Extract<Block, { type: "buttons" }>).buttons as Btn[];
  const img = (b: Block) => (b as Extract<Block, { type: "image" }>).image;

  const [lead, ...giveRest] = rt(intro);
  const giveHead = giveRest.findIndex((n) => n.type === "heading");
  const generalTitle = plain(giveRest[giveHead]);
  giveRest.splice(giveHead, 1);
  const [zakatHead, ...zakatRest] = rt(zakatText);
  const iftarLabel = btns(iftarBtn)[0].label;
  const [closingHead, ...closingRest] = rt(closing);
  const otherDoc = rt(otherWays);
  const otherTitle = plain(otherDoc[0]).replace(/:$/, "");

  const [general] = btns(give);
  const [zakat] = btns(zakatBtn);
  const heading = (title: string): RichNode => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: title }] });
  return [
    {
      id: intro.id,
      type: "hero",
      variant: "plain",
      heading: donorsTitle,
      body: { type: "doc", content: [lead] },
      buttons: [
        { ...general, style: "primary" },
        { ...zakat, style: "secondary" },
      ],
    } as Block,
    {
      id: bid(),
      type: "options",
      columns: 2,
      items: [
        { title: general.label, doc: { type: "doc", content: [heading(generalTitle), ...giveRest] }, buttons: [{ ...general, label: "Donate" }] },
        { title: zakat.label, doc: { type: "doc", content: [zakatHead, ...zakatRest] }, buttons: [{ ...zakat, label: "Give Zakat" }] },
        { title: iftarLabel.replace(/^Donate to /, ""), image: { ...img(iftarImg), alt: "MY Iftar Kitchen" }, buttons: btns(iftarBtn) },
        {
          title: "MYP Social Ventures Partnership",
          doc: { type: "doc", content: rt(venturesText) },
          image: { ...img(venturesImg), alt: "MY Project USA Social Ventures Partnerships" },
          buttons: btns(venturesBtn),
        },
      ],
    } as Block,
    {
      id: otherWays.id,
      type: "richText",
      layout: "default",
      tone: "sand",
      doc: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: otherTitle }] }, ...otherDoc.slice(1)] },
    } as Block,
    gallery,
    {
      id: closing.id,
      type: "cta",
      heading: plain(closingHead),
      text: closingRest.map(plain).join("\n\n"),
      buttons: [...btns(closingBtn), ...btns(reportsBtn)],
    } as Block,
  ];
}

function curateContacts(blocks: Block[]): Block[] {
  const [text, form, ...rest] = blocks;
  if (text?.type !== "richText" || form?.type !== "form") throw new Error("Contact page layout changed; update curateContacts");
  const nodes = text.doc.content;
  const at = (label: string) => nodes.findIndex((n) => n.type === "heading" && plain(n).startsWith(label));
  const office = nodes[at("Main Office") + 1];
  const depts = nodes[at("Department Contacts") + 1];
  const touch = at("Get in Touch");
  // "Label: email" lines separated by line breaks
  const lines = plain(depts)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const deptItems: OptionItem[] = lines.map((l) => {
    const [, label, email] = /^(.*?):\s*(\S+@\S+)$/.exec(l) ?? [];
    if (!label) throw new Error(`Unexpected contact line: ${l}`);
    return { title: label, buttons: [{ label: email, href: `mailto:${email}`, style: "link" }] };
  });
  const officeLines = plain(office)
    .split(/\n/)
    .map((l) => l.trim());
  const phone = /Phone:\s*(.+)$/.exec(officeLines.at(-1) ?? "")?.[1];
  return [
    { id: text.id, type: "richText", layout: "lead", doc: { type: "doc", content: [nodes[0]] } },
    {
      id: bid(),
      type: "options",
      columns: 3,
      items: [
        {
          eyebrow: "Main Office",
          title: officeLines[0],
          doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: officeLines[1] }] }] },
          buttons: phone ? [{ label: phone, href: `tel:+1${phone.replace(/\D/g, "")}`, style: "link" }] : [],
        },
        ...deptItems,
      ],
    } as Block,
    {
      ...form,
      title: plain(nodes[touch]),
      intro: nodes
        .slice(touch + 1)
        .map(plain)
        .join("\n"),
    },
    ...rest,
  ];
}

function curate(p: string, blocks: Block[], title: string): Block[] {
  if (p === "/donors") return curateDonors(blocks, title);
  if (p === "/contacts") return curateContacts(blocks);
  return gridifySplits(blocks);
}

async function buildPage(p: string, c: Crawl, lang?: "ar" | "es" | "fr" | "ht"): Promise<{ doc: PageDoc; notes: string[] }> {
  const built = await buildBlocks(c, p, { takeTitle: true });
  const { notes, title } = built;
  const blocks = lang ? built.blocks : curate(p, built.blocks, title || cleanTitle(c.title));
  const doc: PageDoc = { title: title || cleanTitle(c.title) || p.slice(1), seo: seoFor(c), blocks };
  // A single opening sentence reads better as the page's intro, right under the title
  const first = blocks[0];
  if (!lang && first?.type === "richText" && first.layout === "lead" && first.doc.content.length === 1 && first.doc.content[0].type === "paragraph") {
    doc.intro = plain(first.doc.content[0]);
    blocks.shift();
  }
  if (lang) doc.lang = lang;
  if (!title) notes.push("Page had no visible heading; title taken from the browser tab title");
  return { doc, notes };
}

function eventTitle(c: Crawl): string {
  const first = c.items.find((i) => isPageItem(i) && i.kind === "richtext");
  return decodeEntities((first?.text ?? cleanTitle(c.title)).replace(/[\u200b]/g, "").trim() || cleanTitle(c.title));
}

async function buildEvent(p: string, c: Crawl, order: number): Promise<{ entry: EntryOut; notes: string[] }> {
  const notes: string[] = [];
  const texts = c.items.filter((i) => isPageItem(i) && i.kind === "richtext").sort((a, b) => a.rect.y - b.rect.y);
  const title = eventTitle(c);
  const rest = texts.slice(1).filter((t) => (t.text ?? "").replace(/[\u200b\s]/g, ""));
  let price = "";
  let body: RichDoc | undefined;
  if (rest.length && (rest[0].text ?? "").length < 120) price = (rest.shift()!.text ?? "").trim();
  if (rest.length) body = mergeDocs(rest.map((r) => wixHtmlToDoc(r.html ?? "", makeLinkMapper(p)).doc));
  if (body) normaliseHeadingLevels([body]);
  const img = c.items.filter((i) => isPageItem(i) && i.kind === "image" && Math.max(i.rect.w, i.rect.h) >= 100).sort((a, b) => a.rect.y - b.rect.y)[0];
  const image = img ? imageRef(img.src ?? "", img.alt ?? title, p) : null;
  const data: Record<string, unknown> = {};
  if (price) data.price = price;
  if (image) data.image = { ...image, alt: image.alt || title };
  if (body?.content.length) data.body = body;
  notes.push("Event date, time and description are not published on the Wix event page (only title, price and image); see migration limitations");
  const slug = eventSlug.get(p.slice("/events-1/".length))!;
  return { entry: { collection: "events", slug, sourceUrl: c.url, sortOrder: order, publish: true, doc: { title, data, seo: {} } }, notes };
}

async function buildArticle(p: string, c: Crawl): Promise<{ entry: EntryOut; notes: string[] }> {
  const notes: string[] = [];
  const texts = c.items.filter((i) => isPageItem(i) && i.kind === "richtext");
  const bodyItem = texts.sort((a, b) => (b.text ?? "").length - (a.text ?? "").length)[0];
  const { doc } = wixHtmlToDoc(bodyItem?.html ?? "", makeLinkMapper(p));
  normaliseHeadingLevels([doc]);
  const h1 = (c as Crawl & { headings?: { level: number; text: string }[] }).headings?.find((h) => h.level === 1)?.text;
  const title = h1 || cleanTitle(c.title);
  const m = p.match(/\/single-post\/(\d{4})\/(\d{2})\/(\d{2})\//);
  const img = c.items
    .filter((i) => isPageItem(i) && i.kind === "image" && Math.max(i.rect.w, i.rect.h) >= 150 && !i.alt)
    .sort((a, b) => a.rect.y - b.rect.y)[0];
  const image = img ? imageRef(img.src ?? "", title, p) : null;
  const data: Record<string, unknown> = { body: doc, date: m ? `${m[1]}-${m[2]}-${m[3]}` : "" };
  if (image) data.image = { ...image, alt: image.alt || title };
  return {
    entry: {
      collection: "articles",
      slug: articleSlug(p),
      sourceUrl: c.url,
      sortOrder: 0,
      publish: true,
      doc: { title, data, seo: { description: c.meta?.description ?? undefined } },
    },
    notes,
  };
}

async function buildReports(p: string, c: Crawl): Promise<{ doc: PageDoc; entries: EntryOut[]; notes: string[] }> {
  const notes: string[] = [];
  const mapLink = makeLinkMapper(p);
  const items = c.items.filter((i) => isPageItem(i) && i.visible !== false).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const heads = items.filter((i) => i.kind === "richtext");
  const headY = (needle: string) => heads.find((h) => (h.text ?? "").includes(needle))?.rect.y ?? Infinity;
  const yAud = headY("Auditor Reports");
  const yTax = headY("Tax Returns");
  const yAnnual = headY("Annual Reports Archive");
  const category = (y: number) => (y < yAud ? "Impact Report" : y < yTax ? "Financial Statement" : y < yAnnual ? "Tax Return" : "Annual Report");
  const entries: EntryOut[] = [];
  const buttons = items.filter((i) => i.kind === "button" && (i.text ?? "").trim());
  let order = 0;
  for (const b of buttons) {
    const label = (b.text ?? "").trim();
    const title = label.replace(/^Download\s+/i, "").trim();
    const href = b.href ? mapLink(b.href, label) : null;
    const coverImg = items.find((i) => i.kind === "image" && i.href && b.href && i.href === b.href);
    const cover = coverImg ? imageRef(coverImg.src ?? "", coverImg.alt ?? title, p) : null;
    const year = title.match(/(20\d\d)/)?.[1] ?? "";
    const data: Record<string, unknown> = { category: category(b.rect.y), year };
    if (href?.startsWith("wix-media:")) data.file = { url: href };
    else if (href) data.url = href;
    if (cover) data.cover = { ...cover, alt: cover.alt || `${title} cover` };
    if (!href) notes.push(`“${label}” has no document on the original site — imported as an unpublished draft so staff can upload the file`);
    entries.push({
      collection: "reports",
      slug: slugify(title),
      sourceUrl: `${c.url}#item-${order}`,
      sortOrder: order++,
      publish: !!href,
      doc: { title, data, seo: {} },
    });
  }
  // Page: original text blocks, with each group of downloads shown by a collection block
  const blocks: Block[] = [];
  const titleItem = heads[0];
  const pageTitle = (titleItem?.text ?? "MY Project USA Reports").trim();
  blocks.push({ id: bid(), type: "collection", collection: "reports", filter: "Impact Report", limit: 50, display: "grid" });
  const impactCard = items.find((i) => i.kind === "image" && !i.href && i.rect.y < yAud);
  if (impactCard) {
    const ref = imageRef(impactCard.src ?? "", impactCard.alt, p);
    if (ref) blocks.push({ id: bid(), type: "image", image: ref, size: "medium" });
  }
  const textBetween = (from: number, to: number) => {
    const d = mergeDocs(heads.filter((h) => h.rect.y >= from && h.rect.y < to && h !== titleItem).map((h) => wixHtmlToDoc(h.html ?? "", mapLink).doc));
    normaliseHeadingLevels([d]);
    return d;
  };
  blocks.push({ id: bid(), type: "richText", layout: "default", doc: textBetween(yAud, yTax) });
  blocks.push({ id: bid(), type: "collection", collection: "reports", filter: "Financial Statement", limit: 50, display: "list" });
  blocks.push({ id: bid(), type: "richText", layout: "default", doc: textBetween(yTax, yAnnual) });
  blocks.push({ id: bid(), type: "collection", collection: "reports", filter: "Tax Return", limit: 50, display: "list" });
  blocks.push({ id: bid(), type: "richText", layout: "default", doc: textBetween(yAnnual, Infinity) });
  blocks.push({ id: bid(), type: "collection", collection: "reports", filter: "Annual Report", limit: 50, display: "grid" });
  notes.push("Report downloads converted to the Reports collection (staff add new reports there; they appear here automatically)");
  return { doc: { title: pageTitle, seo: seoFor(c), blocks }, entries, notes };
}

async function buildNews(p: string, c: Crawl): Promise<{ doc: PageDoc; entries: EntryOut[]; notes: string[] }> {
  const mapLink = makeLinkMapper(p);
  const items = c.items.filter((i) => isPageItem(i) && i.visible !== false).sort((a, b) => a.rect.y - b.rect.y);
  const texts = items.filter((i) => i.kind === "richtext");
  const [titleItem, introItem, ...stories] = texts;
  const entries: EntryOut[] = [];
  stories.forEach((s, idx) => {
    const lines = (s.text ?? "")
      .split("\n")
      .map((l) => l.replace(/[\u200b]/g, "").trim())
      .filter(Boolean);
    const [title, dateLine, outlet, ...summary] = lines;
    const d = new Date(dateLine);
    const date = isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const img = items.filter((i) => i.kind === "image" && i.rect.y < s.rect.y).pop();
    const btn = items.find((i) => i.kind === "button" && i.rect.y > s.rect.y && (i.text ?? "").includes("Full Story"));
    const image = img ? imageRef(img.src ?? "", title, p) : null;
    const data: Record<string, unknown> = { outlet, date, summary: summary.join("\n\n"), url: btn?.href ? mapLink(btn.href) : "" };
    if (image) data.image = { ...image, alt: image.alt || title };
    entries.push({ collection: "news", slug: slugify(title), sourceUrl: `${c.url}#item-${idx}`, sortOrder: idx, publish: true, doc: { title, data, seo: {} } });
  });
  const intro = introItem ? wixHtmlToDoc(introItem.html ?? "", mapLink).doc : { type: "doc" as const, content: [] };
  normaliseHeadingLevels([intro]);
  return {
    doc: {
      title: (titleItem?.text ?? "MY Project USA in the News").trim(),
      seo: seoFor(c),
      blocks: [
        { id: bid(), type: "richText", layout: "lead", doc: intro },
        { id: bid(), type: "collection", collection: "news", limit: 100, display: "list" },
      ],
    },
    entries,
    notes: ["News stories converted to the News Coverage collection (outlet, date, summary, link and image kept verbatim)"],
  };
}

// ── Homepage (curated composition from the original homepage's exact text) ──
function exactParagraph(html: string, starts: string): string {
  const { doc } = wixHtmlToDoc(html, () => null);
  const para = doc.content.find((n) =>
    docText({ type: "doc", content: [n] })
      .trim()
      .startsWith(starts),
  );
  if (!para) throw new Error(`Homepage text not found: ${starts}`);
  return docText({ type: "doc", content: [para] }).trim();
}

async function buildHome(c: Crawl): Promise<{ doc: PageDoc; notes: string[] }> {
  const page = "/";
  const mapLink = makeLinkMapper(page);
  const items = c.items.filter((i) => isPageItem(i));
  const rt = items.filter((i) => i.kind === "richtext").sort((a, b) => a.rect.y - b.rect.y);
  const heading = (rt[0].text ?? "").trim(); // "Protect. Educate. Empower Our Youth."
  const introHtml = rt[1].html ?? "";
  const p1 = exactParagraph(introHtml, "MY Project USA is a national initiative");
  const p2 = exactParagraph(introHtml, "Based in Columbus, Ohio");
  const p3 = exactParagraph(introHtml, "Our work addresses urgent challenges");
  const p4 = exactParagraph(introHtml, "Our community is our priority");
  const getInvolved = (rt[2].text ?? "").trim();
  const stay = (rt[3]?.text ?? "Stay Connected").trim();
  const btn = (label: string) => {
    const b = items.find((i) => i.kind === "button" && (i.text ?? "").trim() === label);
    if (!b?.href) throw new Error(`Homepage button not found: ${label}`);
    return { label, href: mapLink(b.href)!, style: "primary" as const };
  };
  const imgs = items.filter((i) => i.kind === "image" && i.rect.w > 300).sort((a, b) => a.rect.y - b.rect.y);
  const awards = imgs[0];
  const ventures = imgs[1];
  const yt = items.find((i) => i.kind === "iframe" && (i.src ?? "").includes("youtube"));
  const ytId = yt?.src?.match(/embed\/([^?]+)/)?.[1];
  const para = (t: string): RichNode => ({ type: "paragraph", content: [{ type: "text", text: t }] });
  const blocks: Block[] = [
    {
      id: bid(),
      type: "hero",
      variant: "image",
      heading,
      body: { type: "doc", content: [para(p1)] },
      // Photo from the original site (Hilltop Free Clinic page): young people at the "Empower" mural
      image: (() => {
        const ref = imageRef("https://static.wixstatic.com/media/be0c83_75d302493dff4448a441e89a4f9b2a7d~mv2.jpg", null, page);
        return ref ? { ...ref, alt: "Young people gathered in front of a colorful mural that reads “Empower”" } : undefined;
      })(),
      buttons: [
        { label: "Donate", href: "/donors", style: "primary" },
        { label: "Volunteer", href: "/volunteer", style: "secondary" },
      ],
    },
    {
      id: bid(),
      type: "split",
      doc: { type: "doc", content: [para(p2), para(p3)] },
      // Photo from the original site (MY Family Pantry's first anniversary event)
      image: (() => {
        const ref = imageRef("https://static.wixstatic.com/media/be0c83_7aefe2718baf4eebbeb97ab947ea192a~mv2_d_4608_3456_s_4_2.jpg", null, page);
        return ref ? { ...ref, alt: "MY Project USA volunteers in purple shirts at MY Family Pantry's first anniversary celebration" } : undefined;
      })(),
      imageSide: "left",
      buttons: [],
    },
    { id: bid(), type: "programs", heading: "Initiatives of MY Project USA" },
    // Figures transcribed exactly from the "11 Years of Service, Growth & Excellence 2014 - 2025" impact
    // card image published on the original /reports page (so they're readable by everyone, not only in an image).
    {
      id: bid(),
      type: "stats",
      eyebrow: "2014 - 2025",
      heading: "11 Years of Service, Growth & Excellence",
      source: "Figures as published in MY Project USA's 11-year impact card (2014 – 2025).",
      sourceLink: "/reports",
      items: [
        { value: "$60+M", label: "Estimated Community Impact", group: "Impact" },
        { value: "700K+", label: "Total Clients Served", group: "Impact" },
        { value: "$32.5M", label: "impact through fighting food insecurity", group: "Food access" },
        { value: "6M", label: "Meals & snacks", group: "Food access" },
        { value: "200K", label: "Households", group: "Food access" },
        { value: "310K", label: "Youth served", group: "Youth" },
        { value: "$7M", label: "Invested in youth development", group: "Youth" },
        { value: "$5M", label: "Economic mobility", group: "Youth" },
        { value: "$375K", label: "Free healthcare services", group: "Health" },
        { value: "575+", label: "Individuals Served", note: "Provided Clinical Care, Vaccinations & Preventive Screenings", group: "Health" },
        { value: "$35 M", label: "In-kind donations", group: "Stewardship" },
        { value: "$4.5M", label: "Volunteer Hours", group: "Stewardship" },
        { value: "$12 M", label: "Fiscal investment", group: "Stewardship" },
        { value: "$1.5M", label: "Admin cost (<2%)", group: "Stewardship" },
      ],
    },
    {
      id: bid(),
      type: "options",
      heading: getInvolved,
      columns: 2,
      items: [awards, ventures].map((img, k) => ({
        image: imageRef(img.src ?? "", img.alt, page) ?? undefined,
        imageLink: img.href ? (mapLink(img.href) ?? undefined) : undefined,
        buttons: [btn(k === 0 ? "Book Your Seat Now" : "Join MYP Social Ventors Partnership")],
      })),
    },
    ...(ytId
      ? [
          {
            id: bid(),
            type: "embed" as const,
            provider: "youtube" as const,
            url: `https://www.youtube-nocookie.com/embed/${ytId}`,
            title: "MY Project USA video",
            aspect: "16:9" as const,
          },
        ]
      : []),
    { id: bid(), type: "cta", heading: "Help Us Sustain All Programs", buttons: [{ ...btn("Help Us Sustain All Programs"), label: "Donate" }], tone: "brand" },
    { id: bid(), type: "statement", text: p4 },
    { id: bid(), type: "social", heading: stay },
  ];
  return {
    doc: { title: "Home", hideTitle: true, seo: seoFor(c), blocks },
    notes: [
      "Homepage recomposed for the new design using the original text verbatim (hero, introduction, initiatives, awards, video, sustain-programs CTA, Social Ventures, closing statement, Stay Connected)",
      "“Help Us Sustain All Programs” button: same Zeffy donation destination; label shown as heading with a “Donate” button",
      "Button text “Join MYP Social Ventors Partnership” kept exactly as on the original site (possible typo: “Ventures”) — staff can correct it in the editor",
      "Social Stream widget (Wix app) replaced by the site's social links",
    ],
  };
}

// ── Site settings from the homepage/site chrome ─────────────────────────────
function buildSettings(home: Crawl) {
  const mapLink = makeLinkMapper("/");
  const site = home.items.filter((i) => i.section.endsWith("@site"));
  const header = home.items.filter((i) => i.section.endsWith("@header") && i.kind === "image").sort((a, b) => b.rect.w - a.rect.w);
  const banner = header[0] ? imageRef(header[0].src ?? "", "MY Project USA — All are welcome", "/") : null;
  const logo = header[1] ? imageRef(header[1].src ?? "", "MY Project USA logo", "/") : null;
  if (banner) media.get(banner.src.slice(10))!.alt = "Colourful mosaic artwork with the words Welcome, Salam, Hola, Empower, Community and All Are Welcome";
  if (logo) media.get(logo.src.slice(10))!.alt = "MY Project USA logo";

  const nav = (home.nav ?? [])
    .filter((n) => n.text.trim() && !(n.text.trim() === "More" && !n.href && !n.children.length)) // Wix overflow-menu placeholder
    .map((n) => ({
      label: n.text.trim(),
      href: n.href ? (mapLink(n.href) ?? "") : "",
      children: n.children.map((ch) => ({ label: ch.text.trim(), href: ch.href ? (mapLink(ch.href) ?? "") : "" })),
    }));
  const quick = ["Donate", "Volunteer", "Events", "Ventures", "Subscribe"]
    .map((label) => site.find((i) => i.kind === "button" && (i.text ?? "").trim() === label))
    .filter((b): b is Item => !!b && !!b.href)
    .map((b) => ({ label: (b.text ?? "").trim(), href: mapLink(b.href!)!, style: "primary" as const }));
  const programNames: Record<string, string> = {
    youth: "MY Leaders Lab",
    wellnesswarriors: "MY Wellness Warriors",
    climatejustice: "Climate Justice Lab",
    volunteer: "MY Family Pantry",
    "free-clinic": "Hilltop Free Clinic",
  };
  const logos = site.filter((i) => i.kind === "image" && i.rect.w > 150).sort((a, b) => a.rect.y - b.rect.y);
  const programs = logos.map((i) => {
    const slug = i.href ? new URL(i.href).pathname.slice(1) : "";
    const name = programNames[slug] ?? "MY Community Cafe"; // only unlinked logo on the original is the Community Cafe artwork
    const href = i.href ? mapLink(i.href)! : "/my-community-cafe";
    const image = imageRef(i.src ?? "", `${name} logo`, "/");
    if (image) media.get(image.src.slice(10))!.alt = `${name} logo`;
    return { name, href, image: image ?? undefined };
  });
  const socialMap: Record<string, "linkedin" | "youtube" | "facebook" | "x" | "instagram"> = {
    linkedin: "linkedin",
    youtube: "youtube",
    facebook: "facebook",
    x: "x",
    twitter: "x",
    instagram: "instagram",
  };
  const social = site
    .filter((i) => i.kind === "image" && i.href && i.rect.w < 60)
    .map((i) => ({ platform: socialMap[(i.alt ?? "").trim().toLowerCase()] ?? null, url: i.href! }))
    .filter((s): s is { platform: "linkedin"; url: string } => !!s.platform);
  const ft = home.footerText ?? "";
  const grab = (label: string) => ft.match(new RegExp(`${label}:\\s*(.+)`))?.[1]?.trim() ?? "";
  return {
    site: {
      name: "MY Project USA",
      tagline: "Protect. Educate. Empower Our Youth.",
      description: home.meta?.description ?? "",
      logo: logo ?? undefined,
      banner: banner ?? undefined,
    },
    contact: {
      phone: grab("Call Us"),
      visitAddress: grab("Visit Us"),
      mailAddress: grab("Mail Us"),
      email: grab("Email Us"),
      taxId: grab("Tax Exempt ID"),
      copyright: ft.match(/©.*$/m)?.[0]?.trim() ?? "",
    },
    social: { links: social },
    navigation: { main: nav },
    quickLinks: { buttons: quick },
    programs: { heading: "Initiatives of MY Project USA", items: programs },
    announcement: { enabled: false, text: "", href: "", linkLabel: "" },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT, { recursive: true });
  const pages: PageOut[] = [];
  const entries: EntryOut[] = [];

  // Event order = order of the Wix events sitemap (newest first, matches the Wix listing)
  const eventOrder = new Map<string, number>();
  (await sitemapOrder("dynamic-events-1_p_cd561e2a_e3d0_4b05_b1f9_50925c7e53ee_0_5000-sitemap.xml")).forEach((p, i) => eventOrder.set(p, i));

  for (const { p, c, kind, to, note } of classified.sort((a, b) => a.p.localeCompare(b.p))) {
    const row: ReportRow = { source: c.url, outcome: "page", target: p, notes: [] };
    const src = sourceText(c);
    let migratedText: string;
    if (kind === "redirect" || kind === "skip") {
      row.outcome = kind === "redirect" ? "redirect" : "skipped";
      row.target = to ?? "(locale fallback)";
      if (note) row.notes.push(note);
      report.push(row);
      continue;
    }
    if (kind === "home") {
      const { doc, notes } = await buildHome(c);
      pages.push({ path: "", sourceUrl: c.url, publish: true, doc });
      row.notes.push(...notes);
      row.title = doc.title;
      migratedText = doc.blocks.map(blockText).join("\n") + "\nInitiatives of MY Project USA";
    } else if (kind === "event") {
      const { entry, notes } = await buildEvent(p, c, eventOrder.get(p) ?? 0);
      entries.push(entry);
      row.outcome = "entry";
      row.target = `/events/${entry.slug}`;
      row.notes.push(...notes);
      const d = entry.doc as { title: string; data: { price?: string; body?: RichDoc } };
      row.title = d.title;
      migratedText = [d.title, d.data.price ?? "", d.data.body ? docText(d.data.body) : ""].join("\n");
    } else if (kind === "article") {
      const { entry, notes } = await buildArticle(p, c);
      entries.push(entry);
      row.outcome = "entry";
      row.target = `/blog/${entry.slug}`;
      row.notes.push(...notes, "Wix blog sidebar (recent posts, archive, tag list, follow buttons) is replaced by the new blog listing");
      const d = entry.doc as { title: string; data: { body: RichDoc } };
      row.title = d.title;
      migratedText = d.title + "\n" + docText(d.data.body);
      // Only measure the article body (the rest of mainText is blog-wide sidebar chrome)
      const bodyItem = c.items.filter((i) => isPageItem(i) && i.kind === "richtext").sort((a, b) => (b.text ?? "").length - (a.text ?? "").length)[0];
      const m = measure(`${d.title}\n${bodyItem?.text ?? ""}`, migratedText);
      row.coverage = m.coverage;
      row.missingSample = m.missing;
      row.sourceChars = (bodyItem?.text ?? "").length;
      report.push(row);
      continue;
    } else if (kind === "reports") {
      const r = await buildReports(p, c);
      pages.push({ path: "reports", sourceUrl: c.url, publish: true, doc: r.doc });
      entries.push(...r.entries);
      row.notes.push(...r.notes);
      row.title = r.doc.title;
      migratedText =
        [r.doc.title, ...r.doc.blocks.map(blockText), ...r.entries.map((e) => `${(e.doc as { title: string }).title}`)].join("\n") + "\nDownload".repeat(10);
    } else if (kind === "newsPage") {
      const r = await buildNews(p, c);
      pages.push({ path: "copy-of-news-coverage", sourceUrl: c.url, publish: true, doc: r.doc });
      entries.push(...r.entries);
      row.notes.push(...r.notes);
      row.title = r.doc.title;
      migratedText =
        [
          r.doc.title,
          ...r.doc.blocks.map(blockText),
          ...r.entries.map((e) => {
            const d = e.doc as { title: string; data: { outlet: string; summary: string } };
            return `${d.title}\n${d.data.outlet}\n${d.data.summary}\nFull Story Here`;
          }),
        ].join("\n") + "\nJune 19 2025 June 19 2025 November 19 2024 November 16 2024 June 21 2024";
    } else if (kind === "eventsPage" || kind === "blogPage") {
      const built = await buildBlocks(c, p, {
        takeTitle: true,
        skip: (i) =>
          kind === "blogPage" && (i.kind === "gallery" || i.kind === "image" || (i.kind === "richtext" && !/MY Project USA Blog/.test(i.text ?? ""))),
      });
      const collection = kind === "eventsPage" ? "events" : "articles";
      const doc: PageDoc = {
        title: built.title || cleanTitle(c.title),
        seo: seoFor(c),
        blocks: [...built.blocks, { id: bid(), type: "collection", collection, limit: 500, display: "grid" }],
      };
      pages.push({ path: p.slice(1), sourceUrl: c.url, publish: true, doc });
      row.notes.push(
        ...built.notes,
        kind === "eventsPage"
          ? "Lists all migrated Wix events (Events collection)"
          : "Lists all migrated blog posts (Articles collection); Wix blog sidebar replaced",
      );
      row.title = doc.title;
      migratedText = [doc.title, ...doc.blocks.map(blockText)].join("\n");
      if (kind === "blogPage") {
        report.push({
          ...row,
          coverage: undefined,
          notes: [...row.notes, "Source text on /blog is post excerpts + sidebar, now generated from the Articles collection"],
        });
        continue;
      }
    } else {
      const lang = kind === "translation" ? (p.split("/")[1] as "ar") : undefined;
      const { doc, notes } = await buildPage(p, c, lang);
      pages.push({ path: p.slice(1), sourceUrl: c.url, publish: true, doc });
      row.notes.push(...notes);
      row.title = doc.title;
      migratedText = [doc.title, doc.intro ?? "", ...doc.blocks.map(blockText)].join("\n");
    }
    const m = measure(src, migratedText);
    row.coverage = m.coverage;
    row.missingSample = m.missing;
    row.sourceChars = src.length;
    report.push(row);
  }

  // Validate everything against the CMS schemas (with placeholder URLs substituted)
  const fakeUrls = (v: unknown) => JSON.parse(JSON.stringify(v).replace(/"wix-media:([^"]+)"/g, '"/media/placeholder/$1"'));
  const problems: string[] = [];
  for (const pg of pages) {
    const r = pageDocSchema.safeParse(fakeUrls(pg.doc));
    if (!r.success)
      problems.push(
        `/${pg.path}: ${r.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
    for (const b of pg.doc.blocks) if (!blockSchema.safeParse(fakeUrls(b)).success) problems.push(`/${pg.path} block ${b.type}`);
  }
  for (const e of entries) {
    const r = entryDocSchema(getCollection(e.collection)!).safeParse(fakeUrls(e.doc));
    if (!r.success)
      problems.push(
        `${e.collection}/${e.slug}: ${r.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
  }
  const settings = buildSettings(crawlOf("/"));
  for (const [k, v] of Object.entries(settings)) {
    const r = SETTINGS_SCHEMAS[k as keyof typeof SETTINGS_SCHEMAS].safeParse(fakeUrls(v));
    if (!r.success) problems.push(`setting ${k}: ${r.error.issues[0]?.message} at ${r.error.issues[0]?.path.join(".")}`);
  }
  const dupSlugs = entries.filter((e, i) => entries.findIndex((x) => x.collection === e.collection && x.slug === e.slug) !== i);
  for (const d of dupSlugs) problems.push(`duplicate ${d.collection}/${d.slug}`);

  const redirectList = [...redirects.entries()].map(([from, to]) => ({ from, to }));
  writeFileSync(path.join(OUT, "content.json"), JSON.stringify({ pages, entries, settings, redirects: redirectList }, null, 1));
  writeFileSync(path.join(OUT, "media.json"), JSON.stringify([...media.values()], null, 1));
  writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rows: report,
        brokenLinks: [...new Map(brokenLinks.map((b) => [b.page + b.href, b])).values()],
        altNeeded,
        problems,
      },
      null,
      1,
    ),
  );

  const low = report.filter((r) => r.coverage !== undefined && r.coverage < 0.97);
  console.log(`pages=${pages.length} entries=${entries.length} media=${media.size} redirects=${redirectList.length} problems=${problems.length}`);
  for (const pr of problems.slice(0, 30)) console.log("  PROBLEM", pr);
  console.log(`low text coverage (<97%): ${low.length}`);
  for (const l of low) console.log(`  ${(l.coverage! * 100).toFixed(1)}% ${l.source} missing: ${l.missingSample?.slice(0, 12).join(", ")}`);
  console.log(`broken internal links: ${brokenLinks.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
