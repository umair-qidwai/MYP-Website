import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { pageDocSchema } from "@shared/blocks";
import { buildDonationPage, DONATION_FORM_URL, DONATION_ORGANIZATION_URL, DONATION_PAGE } from "@shared/donation";
import { embedFallbackUrl } from "@shared/embeds";

const migration = readFileSync("migrations/0002_donation_page.sql", "utf8");
const consolidation = readFileSync("migrations/0003_full_donation_page.sql", "utf8");

describe("on-site donations", () => {
  it("migrates existing donation links while preserving drafts and other campaigns", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(readFileSync("migrations/0001_init.sql", "utf8"));
      const zakat = "https://www.zeffy.com/fundraising/give-zakat-for-local-muslim-youth-and-families";
      const draft = JSON.stringify({ title: "Unsaved draft", links: [DONATION_FORM_URL, zakat] });
      const published = JSON.stringify({ title: "Live title", links: [DONATION_ORGANIZATION_URL, zakat] });
      db.prepare(
        "INSERT INTO pages (id, path, title, status, draft_json, published_json, has_changes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      ).run("home", "", "Home", "published", draft, published, "2026-01-01", "2026-01-01");
      db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)").run(
        "quickLinks",
        JSON.stringify({
          buttons: [
            { label: "Donate", href: DONATION_ORGANIZATION_URL },
            { label: "Volunteer", href: "/volunteer" },
          ],
        }),
        "2026-01-01",
      );
      db.exec(migration);
      const home = db.prepare("SELECT draft_json, published_json, has_changes FROM pages WHERE path = ''").get()!;
      expect(JSON.parse(home.draft_json as string)).toEqual({ title: "Unsaved draft", links: ["/donate", zakat] });
      expect(JSON.parse(home.published_json as string)).toEqual({ title: "Live title", links: ["/donate", zakat] });
      expect(home.has_changes).toBe(1);
      const settings = db.prepare("SELECT value_json FROM settings WHERE key = 'quickLinks'").get()!;
      expect(JSON.parse(settings.value_json as string).buttons).toEqual([
        { label: "Donate", href: "/donate" },
        { label: "Volunteer", href: "/volunteer" },
      ]);
      const page = db.prepare("SELECT status, draft_json, published_json FROM pages WHERE path = 'donate'").get()!;
      expect(page.status).toBe("published");
      expect(pageDocSchema.parse(JSON.parse(page.published_json as string))).toEqual(pageDocSchema.parse(DONATION_PAGE));
      expect(page.draft_json).toBe(page.published_json);

      // Existing staff edits survive applying the seed again.
      db.prepare("UPDATE pages SET draft_json = ? WHERE path = 'donate'").run(JSON.stringify({ ...DONATION_PAGE, title: "Staff draft" }));
      db.exec(migration);
      expect(JSON.parse(db.prepare("SELECT draft_json FROM pages WHERE path = 'donate'").get()!.draft_json as string).title).toBe("Staff draft");
    } finally {
      db.close();
    }
  });

  it("includes the donation page and internal general-giving links in fresh imports", () => {
    const bundle = JSON.parse(readFileSync("migration/bundle/content.json", "utf8"));
    const donation = bundle.pages.find((p: { path: string }) => p.path === "donate");
    expect(donation.doc.blocks.map((b: { type: string }) => b.type)).toEqual(["hero", "embed", "buttons", "options", "richText", "gallery", "cta"]);
    expect(donation.doc.blocks[1]).toEqual(DONATION_PAGE.blocks[0]);
    expect(donation.doc.blocks[2].buttons[0].href).toBe(DONATION_ORGANIZATION_URL);
    expect(donation.doc.blocks[3].items.map((i: { title: string }) => i.title)).toEqual([
      "General Donations",
      "Zakat for Muslim Children & Families",
      "MY Iftar Kitchen",
      "MYP Social Ventures Partnership",
    ]);
    expect(donation.doc.blocks[0].buttons[0].href).toBe("#section-donation-form");
    expect(bundle.pages.some((p: { path: string }) => p.path === "donors")).toBe(false);
    expect(bundle.redirects).toContainEqual({ from: "/donors", to: "/donate" });
    expect(bundle.settings.navigation.main.some((n: { href: string }) => n.href === "/donate" || n.href === "/donors")).toBe(false);
    expect(bundle.settings.quickLinks.buttons.find((b: { label: string }) => b.label === "Donate").href).toBe("/donate");
    const home = bundle.pages.find((p: { path: string }) => p.path === "");
    expect(JSON.stringify(home.doc)).toContain('"href":"/donate"');
    expect(JSON.stringify(home.doc)).not.toContain(DONATION_FORM_URL);
    expect(JSON.stringify(home.doc)).not.toContain(DONATION_ORGANIZATION_URL);
  });

  it("moves the full Donors page while preserving its identity, history, and unpublished edits", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(readFileSync("migrations/0001_init.sql", "utf8"));
      db.exec(migration);
      const published = pageDocSchema.parse({
        title: "Original giving page",
        seo: { description: "Original giving description." },
        blocks: [
          { id: "give-hero", type: "hero", heading: "Support our work", buttons: [{ label: "General Donations", href: "/donate" }] },
          {
            id: "give-options",
            type: "options",
            items: [{ title: "Give Zakat", buttons: [{ label: "Give Zakat", href: "https://www.zeffy.com/fundraising/zakat" }] }],
          },
          {
            id: "give-offline",
            type: "richText",
            doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original check and bank instructions." }] }] },
          },
          { id: "give-gallery", type: "gallery", images: [{ image: { src: "/media/giving.png", alt: "Original giving photo" } }] },
          { id: "give-reports", type: "cta", heading: "Our reports", buttons: [{ label: "Reports", href: "/reports" }] },
        ],
      });
      const draft = { ...published, intro: "Unpublished staff edits." };
      db.prepare(
        "INSERT INTO pages (id, path, title, status, draft_json, published_json, has_changes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      ).run("original-donors", "donors", published.title, "published", JSON.stringify(draft), JSON.stringify(published), "2026-01-01", "2026-01-01");
      db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)").run(
        "navigation",
        JSON.stringify({ main: [{ label: "DONORS", href: "/donors", children: [] }] }),
        "2026-01-01",
      );
      db.exec("INSERT INTO redirects (from_path, to_path, created_at) VALUES ('/old-giving', '/donors', '2026-01-01')");
      db.exec(consolidation);
      const page = db.prepare("SELECT * FROM pages WHERE path = 'donate'").get()!;
      expect(page.id).toBe("original-donors");
      expect(page.has_changes).toBe(1);
      expect(page.status).toBe("published");
      expect(pageDocSchema.parse(JSON.parse(page.draft_json as string))).toEqual(pageDocSchema.parse(buildDonationPage(draft)));
      expect(pageDocSchema.parse(JSON.parse(page.published_json as string))).toEqual(pageDocSchema.parse(buildDonationPage(published)));
      expect(page.created_at).toBe("2026-01-01");
      expect(db.prepare("SELECT id FROM pages WHERE path = 'donors'").get()).toBeUndefined();
      expect(db.prepare("SELECT deleted_at FROM pages WHERE id = 'page_donate'").get()!.deleted_at).toBeTruthy();
      expect(db.prepare("SELECT count(*) AS total FROM revisions WHERE entity_id = 'original-donors'").get()!.total).toBe(2);
      const nav = JSON.parse(db.prepare("SELECT value_json FROM settings WHERE key = 'navigation'").get()!.value_json as string);
      expect(nav.main).toEqual([{ label: "DONATE", href: "/donate", children: [] }]);
      expect(db.prepare("SELECT to_path, status_code FROM redirects WHERE from_path = '/donors'").get()).toEqual({ to_path: "/donate", status_code: 301 });
      expect(db.prepare("SELECT to_path FROM redirects WHERE from_path = '/old-giving'").get()!.to_path).toBe("/donate");
      db.exec(consolidation);
      expect(db.prepare("SELECT draft_json FROM pages WHERE path = 'donate'").get()!.draft_json).toBe(page.draft_json);
    } finally {
      db.close();
    }
  });

  it("opens hosted forms as a fallback while preserving tracking parameters", () => {
    expect(embedFallbackUrl("https://www.zeffy.com/en-US/embed/donation-form/give?embedded=true&utm_source=site", "zeffy")).toBe(
      "https://www.zeffy.com/en-US/donation-form/give?utm_source=site",
    );
    expect(embedFallbackUrl("https://docs.google.com/forms/d/e/example/viewform?embedded=true", "google-form")).toBe(
      "https://docs.google.com/forms/d/e/example/viewform",
    );
    expect(embedFallbackUrl("", "zeffy")).toBe("");
  });
});
