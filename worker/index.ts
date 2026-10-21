/**
 * Cloudflare Worker entry point.
 *
 *  /api/public/*  public JSON (page data, form submissions)
 *  /api/auth/*    sign-in, sign-out, password links
 *  /api/admin/*   CMS API (session + CSRF protected)
 *  /api/import/*  one-off migration import (IMPORT_TOKEN)
 *  /media/*       files from R2
 *  /admin/*       CMS single-page app (never cached, never indexed)
 *  everything else → public pages: redirects, then the SPA shell with SEO metadata + content snapshot
 */
import { HTTPException } from "hono/http-exception";
import { createApp, HttpError } from "./app";
import { cachedPath, cachedSettings, resolvePath, withMediaBase, type WaitUntil } from "./lib/content";
import { requireUser } from "./lib/guards";
import { loadSession, isDev } from "./lib/session";
import { buildHead, renderSnapshot } from "./lib/ssr";
import { escapeHtml } from "@shared/richtext";
import { normalizePath } from "@shared/slug";
import { COLLECTIONS } from "@shared/collections";
import { LANGUAGES, type Lang } from "@shared/blocks";
import { jsonForScript } from "./lib/util";
import type { PublicBootstrap, PublicPagePayload } from "@shared/types";
import { publicRoutes } from "./routes/public";
import { authRoutes } from "./routes/auth";
import { pageRoutes } from "./routes/admin/pages";
import { entryRoutes } from "./routes/admin/entries";
import { mediaRoutes } from "./routes/admin/media";
import { siteRoutes } from "./routes/admin/site";
import { importRoutes } from "./routes/import";

const app = createApp();

// ── Security headers on every Worker response ────────────────────────────────
const FRAME_SRC = [
  "'self'",
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://docs.google.com",
  "https://www.google.com",
  "https://maps.google.com",
  "https://calendar.google.com",
  "https://www.eventbrite.com",
  "https://eventbrite.com",
  "https://www.zeffy.com",
  "https://www.facebook.com",
  "https://player.vimeo.com",
  "https://www.nbc4i.com",
  "https://challenges.cloudflare.com",
];

function csp(env: Env): string {
  const media = env.MEDIA_PUBLIC_BASE ? ` ${new URL(env.MEDIA_PUBLIC_BASE).origin}` : "";
  return [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://i.ytimg.com${media}`,
    `media-src 'self' blob:${media}`,
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    `frame-src ${FRAME_SRC.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

app.use("*", async (c, next) => {
  await next();
  // Responses served from the Cache API have immutable headers; re-wrap before decorating.
  c.res = new Response(c.res.body, c.res);
  const h = c.res.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (!isDev(c.env)) {
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (!h.has("Content-Security-Policy")) h.set("Content-Security-Policy", csp(c.env));
  }
  if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "SAMEORIGIN");
});

// ── Errors: friendly JSON for the API, never stack traces ───────────────────
app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, details: err.details }, err.status);
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(JSON.stringify({ level: "error", path: new URL(c.req.url).pathname, message: String(err), stack: (err as Error).stack?.slice(0, 2000) }));
  return c.json({ error: "Something went wrong on our side. Please try again." }, 500);
});

// ── API ─────────────────────────────────────────────────────────────────────
app.route("/api/public", publicRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/import", importRoutes);

const admin = createApp();
admin.use("*", requireUser);
admin.route("/pages", pageRoutes);
admin.route("/entries", entryRoutes);
admin.route("/media", mediaRoutes);
admin.route("/", siteRoutes);
app.route("/api/admin", admin);

app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

// ── Media from R2 ───────────────────────────────────────────────────────────
app.get("/media/*", async (c) => {
  const key = decodeURIComponent(new URL(c.req.url).pathname.slice("/media/".length));
  if (!key || key.includes("..") || key.length > 400) return c.notFound();
  const cache = caches.default;
  const cacheKey = new Request(new URL(c.req.url).toString(), { method: "GET" });
  const range = c.req.header("range");
  if (!range) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const obj = await c.env.MEDIA.get(key, { range: c.req.raw.headers, onlyIf: c.req.raw.headers });
  if (!obj) return c.text("Not found", 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Accept-Ranges", "bytes");
  // Files are user uploads: never let a browser treat them as an active document on our origin.
  headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers });
  if (range && obj.range && "offset" in obj.range) {
    const offset = obj.range.offset ?? 0;
    const length = obj.range.length ?? obj.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  const res = new Response(obj.body, { headers });
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
});

// ── robots.txt & sitemap.xml ────────────────────────────────────────────────
app.get("/robots.txt", (c) => {
  const site = c.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const body = isDev(c.env) || new URL(c.req.url).hostname.endsWith(".workers.dev")
    ? "User-agent: *\nDisallow: /\n" // never index preview deployments
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /preview\n\nSitemap: ${site}/sitemap.xml\n`;
  return c.text(body, 200, { "Cache-Control": "public, max-age=3600" });
});

app.get("/sitemap.xml", async (c) => {
  const site = c.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const [pages, entries] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT path, published_at, published_json FROM pages WHERE status = 'published' AND deleted_at IS NULL"),
    c.env.DB.prepare("SELECT collection, slug, published_at FROM entries WHERE status = 'published' AND deleted_at IS NULL"),
  ]);
  const urls: string[] = [];
  for (const p of pages.results as { path: string; published_at: string | null; published_json: string }[]) {
    if (p.published_json.includes('"noindex":true')) continue;
    urls.push(`<url><loc>${escapeHtml(`${site}/${p.path}`.replace(/\/$/, ""))}</loc>${p.published_at ? `<lastmod>${p.published_at.slice(0, 10)}</lastmod>` : ""}</url>`);
  }
  for (const e of entries.results as { collection: string; slug: string; published_at: string | null }[]) {
    const def = COLLECTIONS.find((d) => d.key === e.collection);
    if (def?.publicPath) urls.push(`<url><loc>${escapeHtml(`${site}/${def.publicPath}/${e.slug}`)}</loc></url>`);
  }
  return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, 200, {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
});

// ── HTML shell helpers ──────────────────────────────────────────────────────
async function shell(env: Env, reqUrl: string): Promise<string> {
  const res = await env.ASSETS.fetch(new Request(new URL("/", reqUrl)));
  return res.text();
}

function htmlResponse(html: string, status: number, extra: Record<string, string> = {}): Response {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...extra } });
}

/** Fill the SPA shell with metadata, a content snapshot and the bootstrap data. */
async function renderPage(env: Env, ctx: WaitUntil, reqUrl: string, payload: PublicPagePayload, status: number, cacheControl: string): Promise<Response> {
  const settings = withMediaBase(await cachedSettings(env, ctx), env.MEDIA_PUBLIC_BASE);
  const data = withMediaBase(payload, env.MEDIA_PUBLIC_BASE);
  const site = env.PUBLIC_SITE_URL || new URL(reqUrl).origin;
  const head = buildHead(data, settings, site);
  const boot: PublicBootstrap = { settings, turnstileSiteKey: env.TURNSTILE_SITE_KEY, data };
  const lang = data.kind === "page" ? ((data.page.lang ?? "en") as Lang) : "en";
  const alternates =
    data.kind === "page" && data.translations
      ? Object.entries(data.translations)
          .map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${escapeHtml(`${site.replace(/\/$/, "")}/${p}`)}">`)
          .join("")
      : "";
  const metas = [
    `<meta name="description" content="${escapeHtml(head.description)}">`,
    `<link rel="canonical" href="${escapeHtml(head.canonical)}">`,
    `<meta property="og:type" content="${head.type}">`,
    `<meta property="og:site_name" content="${escapeHtml(settings.site.name)}">`,
    `<meta property="og:title" content="${escapeHtml(head.title)}">`,
    `<meta property="og:description" content="${escapeHtml(head.description)}">`,
    `<meta property="og:url" content="${escapeHtml(head.canonical)}">`,
    head.image ? `<meta property="og:image" content="${escapeHtml(head.image)}">` : "",
    `<meta name="twitter:card" content="${head.image ? "summary_large_image" : "summary"}">`,
    head.noindex ? `<meta name="robots" content="noindex">` : "",
    alternates,
    ...head.jsonLd.map((j) => `<script type="application/ld+json">${jsonForScript(j)}</script>`),
  ].join("");

  const rewriter = new HTMLRewriter()
    .on("html", {
      element: (el) => {
        el.setAttribute("lang", lang);
        el.setAttribute("dir", LANGUAGES[lang]?.dir ?? "ltr");
      },
    })
    .on("title", {
      element: (el) => {
        el.setInnerContent(head.title);
      },
    })
    .on("head", {
      element: (el) => {
        el.append(metas, { html: true });
      },
    })
    .on("div#root", {
      element: (el) => {
        el.setInnerContent(renderSnapshot(data, settings), { html: true });
        el.after(`<script id="__BOOT__" type="application/json">${jsonForScript(boot)}</script>`, { html: true });
      },
    });
  return rewriter.transform(htmlResponse(await shell(env, reqUrl), status, { "Cache-Control": cacheControl }));
}

// ── Admin SPA (no metadata injection, never cached or indexed) ──────────────
app.get("/admin", (c) => c.redirect("/admin/", 302));
app.get("/admin/*", async (c) => {
  const html = await shell(c.env, c.req.url);
  return htmlResponse(html.replace("<head>", '<head><meta name="robots" content="noindex, nofollow">'), 200, { "Cache-Control": "no-store", "X-Frame-Options": "DENY" });
});

// ── Private draft preview: /preview/<path> (signed-in staff only) ───────────
app.get("/preview/*", async (c) => {
  const s = await loadSession(c);
  const path = new URL(c.req.url).pathname.replace(/^\/preview\/?/, "");
  if (!s) return c.redirect(`/admin/login?next=${encodeURIComponent(`/preview/${path}`)}`, 302);
  const payload = await resolvePath(c.env.DB, path, { preview: true });
  return renderPage(c.env, c.executionCtx, c.req.url, payload, payload.kind === "notFound" ? 404 : 200, "no-store");
});

// ── Legacy Wix URL patterns ─────────────────────────────────────────────────
function legacyFallback(path: string): string | null {
  if (/^\/(events-1|events-3)(\/|$)/.test(path)) return "/events";
  if (/^\/single-post\//.test(path) || /^\/blog\/(tags|archive|categories|page)(\/|$)/.test(path) || /^\/post\//.test(path)) return "/blog";
  if (/^\/(product-page|shop|cart|checkout)(\/|$)/.test(path)) return "/";
  return null;
}

// ── Public pages ────────────────────────────────────────────────────────────
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  // Canonical URLs have no trailing slash
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    return c.redirect(url.pathname.replace(/\/+$/, "") + url.search, 301);
  }
  const rawPath = url.pathname;
  const norm = normalizePath(rawPath);
  const path = norm === "/" ? "" : norm.slice(1);

  const payload = await cachedPath(c.env, c.executionCtx, path);
  if (payload.kind !== "notFound") {
    return renderPage(c.env, c.executionCtx, c.req.url, payload, 200, "public, max-age=0, must-revalidate");
  }

  // Exact redirect (imported Wix URLs and staff-managed redirects)
  const r = await c.env.DB.prepare("SELECT to_path, status_code FROM redirects WHERE from_path = ?").bind(norm).first<{ to_path: string; status_code: number }>();
  if (r) return c.redirect(r.to_path, r.status_code as 301 | 302);

  // Untranslated Wix language URLs (/es/..., /ar/...) → the English page
  const lang = norm.match(/^\/(ar|es|fr|ht|so)(\/.*)?$/);
  if (lang) return c.redirect(lang[2] || "/", 302);

  const legacy = legacyFallback(norm);
  if (legacy) return c.redirect(legacy, 301);

  return renderPage(c.env, c.executionCtx, c.req.url, payload, 404, "no-store");
});

export default app;
