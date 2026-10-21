/**
 * Audit crawler for the legacy Wix site.
 *
 * Renders every URL listed in the public sitemaps (plus internal links discovered
 * while crawling) in headless Chromium and records structured content to
 * migration/crawl/pages/*.json. Respectful: low concurrency, delay between requests,
 * identifies itself, honours robots.txt disallow of `?lightbox=` URLs.
 *
 * Usage: npx tsx scripts/audit/crawl.ts [--only=pages|events|products] [--limit=N] [--url=...]
 */
import { chromium, type Page } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const ORIGIN = "https://www.myprojectusa.org";
const OUT = path.resolve("migration/crawl");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 MYP-migration-audit";
const DELAY_MS = 1200;
const CONCURRENCY = 2;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function urlKey(u: string): string {
  const p = new URL(u).pathname.replace(/\/$/, "") || "/";
  const safe = decodeURIComponentSafe(p)
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9-_/]+/g, "_")
    .replace(/\//g, "__");
  const h = createHash("sha1").update(p).digest("hex").slice(0, 6);
  return `${safe || "home"}--${h}`;
}

function decodeURIComponentSafe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

async function fetchText(url: string) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  return r.text();
}

async function sitemapUrls(name: string): Promise<string[]> {
  const xml = await fetchText(`${ORIGIN}/${name}`);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1]
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"'),
  );
}

/** Runs inside the browser. Must be self-contained. */
function extractInPage() {
  const abs = (h: string | null) => {
    if (!h) return null;
    try {
      return new URL(h, location.href).href;
    } catch {
      return h;
    }
  };
  const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.01;
  };
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute("content") ?? null;

  const pageRoot = document.querySelector("#PAGES_CONTAINER") || document.querySelector("main") || document.body;
  const root = document.body;
  const header = document.querySelector("#SITE_HEADER");
  const footer = document.querySelector("#SITE_FOOTER");

  // region: where the element lives. "site" = Wix master-page components shown on every page.
  const regionOf = (el: Element) => (header?.contains(el) ? "header" : footer?.contains(el) ? "footer" : pageRoot.contains(el) ? "page" : "site");
  const sectionOf = (el: Element) => {
    const s = el.closest("section");
    return (s ? s.id || "" : "") + "@" + regionOf(el);
  };

  type Item = Record<string, unknown> & { kind: string; rect: ReturnType<typeof rectOf>; section: string | null };
  const items: Item[] = [];
  const seen = new Set<Element>();

  // Rich text blocks
  root.querySelectorAll('[data-testid="richTextElement"], .wixui-rich-text, [class*="richTextContainer"]').forEach((el) => {
    if (seen.has(el) || [...seen].some((s) => s.contains(el))) return;
    seen.add(el);
    const text = (el as HTMLElement).innerText.trim();
    if (!text) return;
    items.push({ kind: "richtext", html: el.innerHTML, text, visible: visible(el), rect: rectOf(el), section: sectionOf(el) });
  });

  // Images (excluding those inside galleries - captured separately)
  root.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    const inGallery = !!el.closest('[data-testid="gallery"], .pro-gallery, [data-hook="item-container"], [data-testid="slideshow"]');
    const link = el.closest("a");
    items.push({
      kind: "image",
      src: el.currentSrc || el.src,
      srcAttr: el.getAttribute("src"),
      alt: el.alt || null,
      naturalW: el.naturalWidth,
      naturalH: el.naturalHeight,
      inGallery,
      href: link ? abs(link.getAttribute("href")) : null,
      visible: visible(el),
      rect: rectOf(el),
      section: sectionOf(el),
    });
  });

  // Background images (Wix strips / boxes use bgImage wow-image components with <img>, but also CSS bg)
  root.querySelectorAll<HTMLElement>("[data-testid='bgMedia'], [data-testid='colorUnderlay']").forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") items.push({ kind: "bgimage", css: bg, rect: rectOf(el), section: sectionOf(el), visible: visible(el) });
  });

  // Buttons and link elements
  root.querySelectorAll<HTMLElement>('[data-testid="linkElement"], a[data-testid], [data-testid="buttonElement"], .wixui-button').forEach((el) => {
    if (el.closest('[data-testid="richTextElement"]')) return;
    const a = el.tagName === "A" ? el : el.closest("a") || el.querySelector("a");
    const text = el.innerText.trim();
    if (!text && !a) return;
    items.push({
      kind: "button",
      text,
      href: a ? abs(a.getAttribute("href")) : null,
      target: a?.getAttribute("target") ?? null,
      ariaLabel: el.getAttribute("aria-label"),
      visible: visible(el),
      rect: rectOf(el),
      section: sectionOf(el),
    });
  });

  // Iframes / embeds
  root.querySelectorAll("iframe").forEach((f) => {
    items.push({
      kind: "iframe",
      src: abs(f.getAttribute("src")),
      title: f.getAttribute("title"),
      rect: rectOf(f),
      section: sectionOf(f),
      visible: visible(f),
    });
  });
  root.querySelectorAll("video").forEach((v) => {
    items.push({
      kind: "video",
      src: abs((v as HTMLVideoElement).currentSrc || v.getAttribute("src")),
      poster: v.getAttribute("poster"),
      rect: rectOf(v),
      section: sectionOf(v),
      visible: visible(v),
    });
  });

  // Galleries
  root.querySelectorAll('[data-testid="gallery"], .pro-gallery, [data-testid="slideshow"], [data-testid="matrix-gallery"]').forEach((g) => {
    const imgs = [...g.querySelectorAll("img")].map((i) => ({
      src: (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src,
      alt: (i as HTMLImageElement).alt || null,
    }));
    const titles = [...g.querySelectorAll('[data-hook="item-title"], [data-hook="title"]')].map((t) => (t as HTMLElement).innerText.trim());
    const descs = [...g.querySelectorAll('[data-hook="item-description"], [data-hook="description"]')].map((t) => (t as HTMLElement).innerText.trim());
    const links = [...g.querySelectorAll("a")].map((a) => abs(a.getAttribute("href")));
    items.push({ kind: "gallery", id: g.id, imgs, titles, descs, links, rect: rectOf(g), section: sectionOf(g), visible: visible(g) });
  });

  // Accordions / FAQ widgets (expanded by the crawler before extraction)
  pageRoot.querySelectorAll<HTMLElement>('button[aria-expanded]:not([data-testid^="languages"])').forEach((btn) => {
    const question = btn.innerText.trim();
    if (!question) return;
    let item: HTMLElement | null = btn;
    for (let i = 0; i < 6 && item; i++) {
      item = item.parentElement;
      if (item && item.innerText.trim().length > question.length + 5) break;
    }
    if (!item) return;
    const clone = item.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("button").forEach((b) => b.remove());
    seen.add(item);
    items.push({
      kind: "accordion",
      question,
      answerHtml: clone.innerHTML,
      answerText: clone.innerText?.trim() ?? clone.textContent?.trim(),
      rect: rectOf(item),
      section: sectionOf(item),
      visible: true,
    });
  });

  // Forms
  const forms = [...root.querySelectorAll('form, [data-testid="form"], [data-hook="form"], .wixui-form')].map((f) => {
    const fields = [...f.querySelectorAll("input, textarea, select")].map((i) => {
      const el = i as HTMLInputElement;
      const id = el.id;
      const label = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim()) || el.closest("label")?.textContent?.trim() || null;
      const options = el.tagName === "SELECT" ? [...(el as unknown as HTMLSelectElement).options].map((o) => o.text) : undefined;
      return {
        tag: el.tagName.toLowerCase(),
        type: el.type,
        name: el.name || null,
        placeholder: el.placeholder || null,
        required: el.required,
        ariaLabel: el.getAttribute("aria-label"),
        label,
        options,
      };
    });
    return { action: f.getAttribute("action"), text: (f as HTMLElement).innerText.trim().slice(0, 3000), fields, rect: rectOf(f) };
  });

  // All links in the content area
  const links = [...root.querySelectorAll("a[href]")].map((a) => ({
    region: regionOf(a),
    href: abs(a.getAttribute("href")),
    text: (a as HTMLElement).innerText.trim(),
    target: a.getAttribute("target"),
  }));

  // Navigation structure (header)
  const nav: { text: string; href: string | null; children: { text: string; href: string | null }[] }[] = [];
  if (header) {
    const menu = header.querySelector("nav") || header;
    menu.querySelectorAll(":scope ul > li, :scope [data-testid='dropdown-menu'] > li").forEach(() => {});
    const topLis = [...menu.querySelectorAll("li")].filter((li) => !li.parentElement?.closest("li"));
    for (const li of topLis) {
      const a = li.querySelector("a");
      const label = (li.querySelector("p, span") as HTMLElement | null)?.textContent?.trim() || (a?.textContent ?? "").trim();
      const children = [...li.querySelectorAll("li")].map((c) => ({
        text: (c.textContent ?? "").trim(),
        href: abs(c.querySelector("a")?.getAttribute("href") ?? null),
      }));
      nav.push({ text: label, href: abs(a?.getAttribute("href") ?? null), children });
    }
  }

  // Catch-all: visible text in the page area that no captured element covers
  const covered = (n: Node) => {
    for (let el = n.parentElement; el; el = el.parentElement) {
      if (seen.has(el)) return true;
      if (el.matches('a, button, form, [data-testid="gallery"], .pro-gallery, [data-testid="slideshow"], iframe, nav, [data-testid="languages-container"]'))
        return true;
      if (el === pageRoot) return false;
    }
    return false;
  };
  const orphanParents = new Set<HTMLElement>();
  const tw = document.createTreeWalker(pageRoot, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!(n.textContent ?? "").replace(/[\s\u200b]/g, "")) continue;
    if (covered(n)) continue;
    let block = n.parentElement!;
    while (block.parentElement && block.parentElement !== pageRoot && getComputedStyle(block).display === "inline") block = block.parentElement;
    if (visible(block)) orphanParents.add(block);
  }
  // keep outermost only
  const orphans = [...orphanParents].filter((el) => ![...orphanParents].some((o) => o !== el && o.contains(el)));
  for (const el of orphans) {
    seen.add(el);
    items.push({
      kind: "orphan",
      html: el.innerHTML,
      text: el.innerText.trim(),
      tag: el.tagName.toLowerCase(),
      rect: rectOf(el),
      section: sectionOf(el),
      visible: true,
    });
  }

  const headings = [...pageRoot.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    .map((h) => ({ level: Number(h.tagName[1]), text: (h as HTMLElement).innerText.trim() }))
    .filter((h) => h.text);

  return {
    finalUrl: location.href,
    title: document.title,
    lang: document.documentElement.lang,
    meta: {
      description: meta('meta[name="description"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogImage: meta('meta[property="og:image"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      robots: meta('meta[name="robots"]'),
      alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({
        hreflang: l.getAttribute("hreflang"),
        href: l.getAttribute("href"),
      })),
    },
    headings,
    items,
    forms,
    links,
    nav,
    headerText: header ? (header as HTMLElement).innerText.trim() : null,
    footerText: footer ? (footer as HTMLElement).innerText.trim() : null,
    footerLinks: footer
      ? [...footer.querySelectorAll("a[href]")].map((a) => ({ href: abs(a.getAttribute("href")), text: (a as HTMLElement).innerText.trim() }))
      : [],
    mainText: (pageRoot as HTMLElement).innerText.trim(),
    docHeight: document.documentElement.scrollHeight,
  };
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    const step = 600;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
}

type Job = { url: string; group: string };

async function crawlOne(page: Page, job: Job) {
  const key = urlKey(job.url);
  const file = path.join(OUT, "pages", `${key}.json`);
  if (existsSync(file) && !args.force) return JSON.parse(await readFile(file, "utf8"));
  let status = 0;
  let error: string | null = null;
  let data: Awaited<ReturnType<typeof extractInPage>> | null = null;
  try {
    const resp = await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    status = resp?.status() ?? 0;
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await autoScroll(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // Expand collapsed FAQ/accordion items so their answers can be read
    for (const t of await page.$$('#PAGES_CONTAINER button[aria-expanded="false"]:not([data-testid^="languages"])')) {
      await t.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(150);
    }
    await sleep(800);
    data = await page.evaluate(extractInPage);
    if (args.screens) {
      await page.screenshot({ path: path.join(OUT, "screens", `${key}.jpg`), fullPage: true, type: "jpeg", quality: 45 }).catch(() => {});
    }
  } catch (e) {
    error = String(e);
  }
  const rec = { key, url: job.url, group: job.group, status, error, crawledAt: new Date().toISOString(), ...(data ?? {}) };
  await writeFile(file, JSON.stringify(rec, null, 2));
  return rec;
}

async function main() {
  await mkdir(path.join(OUT, "pages"), { recursive: true });
  await mkdir(path.join(OUT, "screens"), { recursive: true });

  const groups: Record<string, string[]> = {};
  if (args.url) groups.adhoc = [args.url];
  else {
    if (!args.only || args.only === "pages") groups.pages = await sitemapUrls("pages-sitemap.xml");
    if (!args.only || args.only === "events") groups.events = await sitemapUrls("dynamic-events-1_p_cd561e2a_e3d0_4b05_b1f9_50925c7e53ee_0_5000-sitemap.xml");
    if (!args.only || args.only === "products") groups.products = await sitemapUrls("store-products-sitemap.xml");
  }

  const queue: Job[] = [];
  const known = new Set<string>();
  for (const [group, urls] of Object.entries(groups)) {
    for (const u of urls.slice(0, args.limit ? Number(args.limit) : undefined)) {
      if (known.has(u)) continue;
      known.add(u);
      queue.push({ url: u, group });
    }
  }
  const discovered: string[] = [];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
  // tsx/esbuild wraps named functions with a `__name` helper that doesn't exist in the page
  await ctx.addInitScript("window.__name = (f) => f;");
  // Skip heavy third-party trackers to reduce load on everyone
  await ctx.route(/google-analytics|googletagmanager|facebook\.net|doubleclick|hotjar/, (r) => r.abort());

  let done = 0;
  const worker = async () => {
    const page = await ctx.newPage();
    while (queue.length) {
      const job = queue.shift()!;
      const rec = await crawlOne(page, job);
      done++;
      console.log(`[${done}] ${rec.status} ${job.group} ${job.url}${rec.error ? " ERROR " + rec.error.slice(0, 80) : ""}`);
      // Discover internal links not present in sitemaps (same host, no lightbox, no locale prefix)
      if (!args.url && args.discover !== "false") {
        for (const l of [...(rec.links ?? []), ...(rec.footerLinks ?? [])]) {
          if (!l.href) continue;
          let u: URL;
          try {
            u = new URL(l.href);
          } catch {
            continue;
          }
          if (u.hostname !== "www.myprojectusa.org") continue;
          if (u.search.includes("lightbox")) continue;
          if (/^\/(ar|es|fr|ht|so)(\/|$)/.test(u.pathname)) continue;
          if (/\.(pdf|jpg|png|docx?)$/i.test(u.pathname)) continue;
          const clean = `${ORIGIN}${u.pathname.replace(/\/$/, "")}`;
          if (!known.has(clean) && !known.has(clean + "/")) {
            known.add(clean);
            discovered.push(clean);
            queue.push({ url: clean, group: "discovered" });
          }
        }
      }
      await sleep(DELAY_MS);
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
  await writeFile(path.join(OUT, `discovered-${args.only ?? "all"}.json`), JSON.stringify(discovered, null, 2));
  console.log(`Done. ${done} crawled, ${discovered.length} discovered outside sitemaps.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
