import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { pageDocSchema, type PageDoc } from "../../shared/blocks";
import { SETTINGS_SCHEMAS } from "../../shared/settings";
import { buildVisitorPages, reorganizeHome, VISITOR_NAVIGATION, VISITOR_QUICK_LINKS } from "../../shared/visitor-content";

const migration = readFileSync("migrations/0005_visitor_navigation.sql", "utf8");
const bundle = JSON.parse(readFileSync("migration/bundle/content.json", "utf8")) as {
  pages: { path: string; doc: PageDoc }[];
  settings: Record<string, unknown>;
};
const validMedia = (value: unknown) => JSON.parse(JSON.stringify(value).replace(/wix-media:/g, "/media/original/"));

describe("visitor-first content migration", () => {
  it("keeps all new pages editable and all navigation links pointed at real pages", () => {
    const pages = buildVisitorPages();
    const paths = new Set([...bundle.pages.map((p) => `/${p.path}`), ...Object.keys(pages).map((p) => `/${p}`)]);
    expect(SETTINGS_SCHEMAS.navigation.safeParse(VISITOR_NAVIGATION).success).toBe(true);
    expect(SETTINGS_SCHEMAS.quickLinks.safeParse(VISITOR_QUICK_LINKS).success).toBe(true);
    for (const [path, seed] of Object.entries(pages)) {
      expect(pageDocSchema.safeParse(seed).success, path).toBe(true);
      expect(new Set(seed.blocks.map((b) => b.id)).size, path).toBe(seed.blocks.length);
      for (const match of JSON.stringify(seed).matchAll(/"href":"(\/[^"#]*)(?:#[^"]*)?"/g)) expect(paths.has(match[1]), `${path}: ${match[1]}`).toBe(true);
    }
    for (const item of VISITOR_NAVIGATION.main.flatMap((n) => [n, ...n.children])) expect(paths.has(item.href.split("#")[0]), item.href).toBe(true);
  });

  it("reorganizes existing content without losing photography, old sections or unpublished staff drafts", () => {
    const db = new DatabaseSync(":memory:");
    try {
      for (const file of readdirSync("migrations")
        .sort()
        .filter((f) => f.endsWith(".sql") && f < "0005"))
        db.exec(readFileSync(`migrations/${file}`, "utf8"));
      const insert = db.prepare(
        "INSERT OR REPLACE INTO pages (id,path,title,status,draft_json,published_json,has_changes,created_at,updated_at) VALUES (?,?,?,'published',?,?,0,'2026-01-01','2026-01-01')",
      );
      for (const p of bundle.pages) {
        const original = JSON.stringify(validMedia(p.doc));
        insert.run(`original_${p.path}`, p.path, p.doc.title, original, original);
      }
      const setting = db.prepare("INSERT OR REPLACE INTO settings (key,value_json,updated_at) VALUES (?,?,'2026-01-01')");
      for (const [key, value] of Object.entries(bundle.settings)) setting.run(key, JSON.stringify(validMedia(value)));
      const pendingDraft = JSON.stringify({ title: "Unpublished staff work", seo: {}, blocks: [] });
      db.prepare("UPDATE pages SET draft_json = ?, has_changes = 1 WHERE path = 'volunteer'").run(pendingDraft);
      db.exec(migration);

      const rows = db.prepare("SELECT path,draft_json,published_json FROM pages").all() as { path: string; draft_json: string; published_json: string }[];
      for (const row of rows) {
        expect(pageDocSchema.safeParse(JSON.parse(row.published_json)).success, row.path).toBe(true);
        expect(pageDocSchema.safeParse(JSON.parse(row.draft_json)).success, `${row.path} draft`).toBe(true);
      }
      const home = JSON.parse(rows.find((r) => r.path === "")!.published_json) as PageDoc;
      const originalHome = validMedia(bundle.pages.find((p) => p.path === "")!.doc) as PageDoc;
      expect(home).toEqual(reorganizeHome(originalHome));
      for (const original of originalHome.blocks) expect(home.blocks.some((b) => b.id === original.id)).toBe(true);
      expect(rows.find((r) => r.path === "volunteer")!.draft_json).toBe(pendingDraft);
      expect(JSON.parse(rows.find((r) => r.path === "volunteer")!.published_json).blocks[0].id).toBe("volunteer-start");
      const oldPublished = db.prepare("SELECT data_json FROM revisions WHERE entity_id = 'original_volunteer' AND action = 'publish'").get() as {
        data_json: string;
      };
      expect(JSON.parse(oldPublished.data_json)).toEqual(validMedia(bundle.pages.find((p) => p.path === "volunteer")!.doc));
      expect(
        JSON.parse((db.prepare("SELECT value_json FROM settings WHERE key = 'programs'").get() as { value_json: string }).value_json).items.find(
          (p: { name: string }) => p.name === "MY Family Pantry",
        ).href,
      ).toBe("/services#option-get-help-0");
    } finally {
      db.close();
    }
  });
});
