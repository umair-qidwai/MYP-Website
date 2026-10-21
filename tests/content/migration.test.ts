/**
 * Migration verification: checks the generated content bundle against the crawl of the original
 * Wix site. Run after `npm run import:transform`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pageDocSchema } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import { entryDocSchema } from "@shared/collections-schema";
import { normalizePath } from "@shared/slug";

const B = "migration/bundle";
const content = JSON.parse(readFileSync(path.join(B, "content.json"), "utf8")) as {
  pages: { path: string; doc: { blocks: unknown[] } }[];
  entries: { collection: string; slug: string; doc: unknown; publish: boolean }[];
  settings: Record<string, unknown>;
  redirects: { from: string; to: string }[];
};
const media = JSON.parse(readFileSync(path.join(B, "media.json"), "utf8")) as { key: string }[];
const report = JSON.parse(readFileSync(path.join(B, "report.json"), "utf8")) as {
  rows: { source: string; outcome: string; target: string; coverage?: number; missingSample?: string[] }[];
  problems: string[];
  brokenLinks: unknown[];
};
const crawl = readdirSync("migration/crawl/pages").map(
  (f) => JSON.parse(readFileSync(path.join("migration/crawl/pages", f), "utf8")) as { url: string; status: number; group: string },
);

const pagePaths = new Set(content.pages.map((p) => "/" + p.path));
pagePaths.add("/");
const entryPaths = new Set(
  content.entries.flatMap((e) => {
    const def = getCollection(e.collection);
    return def?.publicPath ? [`/${def.publicPath}/${e.slug}`] : [];
  }),
);
const redirectFrom = new Map(content.redirects.map((r) => [r.from, r.to]));
const resolves = (p: string) => {
  const clean = p.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return pagePaths.has(clean) || entryPaths.has(clean) || redirectFrom.has(normalizePath(clean)) || clean.startsWith("/media/");
};

// Pages where specific source text was intentionally not migrated (documented in docs/migration-limitations.md)
const EXPECTED_LOW_COVERAGE = new Set(["https://www.myprojectusa.org/local-chapters-1"]);

describe("content parity with the original site", () => {
  it("accounts for every crawled URL", () => {
    const sources = new Set(report.rows.map((r) => normalizePath(new URL(r.source).pathname)));
    const missing = crawl.filter((c) => c.status === 200 && c.group !== "adhoc" && !sources.has(normalizePath(new URL(c.url).pathname)));
    expect(missing.map((m) => m.url)).toEqual([]);
  });

  it("keeps at least 97% of each page's wording", () => {
    const low = report.rows.filter((r) => r.coverage !== undefined && r.coverage < 0.97 && !EXPECTED_LOW_COVERAGE.has(r.source));
    expect(low.map((r) => `${r.source} ${(r.coverage! * 100).toFixed(1)}%`)).toEqual([]);
  });

  it("has no schema problems in the bundle", () => {
    expect(report.problems).toEqual([]);
  });

  it("every page and entry validates against the CMS schemas", () => {
    const fake = (v: unknown) => JSON.parse(JSON.stringify(v).replace(/"wix-media:([^"]+)"/g, '"/media/placeholder/$1"'));
    for (const p of content.pages) expect(pageDocSchema.safeParse(fake(p.doc)).success, `/${p.path}`).toBe(true);
    for (const e of content.entries)
      expect(entryDocSchema(getCollection(e.collection)!).safeParse(fake(e.doc)).success, `${e.collection}/${e.slug}`).toBe(true);
  });
});

describe("URLs", () => {
  it("every redirect points to something that exists", () => {
    const bad = content.redirects.filter((r) => !resolves(r.to));
    expect(bad).toEqual([]);
  });

  it("every URL from the original sitemaps keeps working (same path, or redirected)", () => {
    const sitemapDir = "migration/crawl/sitemaps";
    const urls = existsSync(sitemapDir)
      ? readdirSync(sitemapDir).flatMap((f) => [...readFileSync(path.join(sitemapDir, f), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
      : [];
    const sitemapPages = crawl.filter((c) => c.group === "pages" || c.group === "events").map((c) => c.url);
    const all = [...new Set([...urls.map((u) => u.replace(/&amp;/g, "&").replace(/&apos;/g, "'")), ...sitemapPages])];
    const broken = all.filter((u) => {
      const p = normalizePath(new URL(u).pathname);
      return !(pagePaths.has(p) || entryPaths.has(p) || redirectFrom.has(p));
    });
    expect(broken).toEqual([]);
  });

  it("internal links in migrated content all resolve", () => {
    const hrefs = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          if (typeof x === "string" && (k === "href" || k === "link" || k === "imageLink" || k === "url") && x.startsWith("/")) hrefs.add(x);
          else walk(x);
        }
      }
    };
    walk(content.pages);
    walk(content.entries);
    walk(content.settings);
    const broken = [...hrefs].filter((h) => !resolves(h));
    expect(broken).toEqual([]);
  });

  it("has no duplicate page paths or entry slugs", () => {
    const paths = content.pages.map((p) => p.path);
    expect(paths.length).toBe(new Set(paths).size);
    const slugs = content.entries.map((e) => `${e.collection}/${e.slug}`);
    expect(slugs.length).toBe(new Set(slugs).size);
  });
});

describe("media", () => {
  it("every media placeholder has a manifest entry", () => {
    const keys = new Set(media.map((m) => m.key));
    const used = [...JSON.stringify(content).matchAll(/wix-media:([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
    expect(used.filter((k) => !keys.has(k))).toEqual([]);
  });

  it("all media imported successfully (when an import has been run)", () => {
    const f = path.join(B, "push-report.json");
    if (!existsSync(f)) return;
    const push = JSON.parse(readFileSync(f, "utf8")) as { media: { failed: unknown[] }; errors: string[]; missingReferences: string[] };
    expect(push.media.failed).toEqual([]);
    expect(push.errors).toEqual([]);
    expect(push.missingReferences).toEqual([]);
  });
});

describe("required pages exist", () => {
  it.each([
    "",
    "vision-mission-goals",
    "team",
    "services",
    "reports",
    "awards",
    "issues",
    "youth",
    "volunteer",
    "donors",
    "contacts",
    "free-clinic",
    "events",
    "blog",
    "copy-of-news-coverage",
    "newsletter",
  ])("/%s", (p) => {
    expect(pagePaths.has("/" + p) || (p === "" && pagePaths.has("/"))).toBe(true);
  });
});
