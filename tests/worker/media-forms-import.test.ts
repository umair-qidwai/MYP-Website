import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, createUser, json, login, ORIGIN, publishedPage } from "./helpers";

// 1×1 transparent PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

function upload(file: Uint8Array, name: string, type: string) {
  const fd = new FormData();
  fd.append("file", new File([file], name, { type }));
  fd.append("alt", "A test picture");
  fd.append("width", "1");
  fd.append("height", "1");
  return fd;
}

describe("media uploads", () => {
  it("accepts images and PDFs, stores them in R2 and serves them safely", async () => {
    const admin = await login((await createUser("admin")).email);
    const r = await call("/api/admin/media", { method: "POST", session: admin, body: upload(PNG, "photo.png", "image/png") });
    expect(r.status).toBe(201);
    const { item } = await json<{ item: { id: string; url: string; mime: string } }>(r);
    expect(item.mime).toBe("image/png");
    expect(item.url).toMatch(/^\/media\/uploads\/\d{4}\/\d{2}\/m_[a-z0-9]+-photo\.png$/);
    const served = await call(item.url);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(served.headers.get("content-security-policy")).toContain("sandbox");

    const pdf = await call("/api/admin/media", { method: "POST", session: admin, body: upload(PDF, "report.pdf", "application/pdf") });
    expect(pdf.status).toBe(201);
  });

  it("rejects disguised or dangerous files regardless of the claimed type", async () => {
    const admin = await login((await createUser("admin")).email);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await call("/api/admin/media", { method: "POST", session: admin, body: upload(svg, "logo.svg", "image/svg+xml") })).status).toBe(415);
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect((await call("/api/admin/media", { method: "POST", session: admin, body: upload(html, "photo.png", "image/png") })).status).toBe(415);
  });

  it("uses safe object names even for hostile file names", async () => {
    const admin = await login((await createUser("admin")).email);
    const r = await call("/api/admin/media", { method: "POST", session: admin, body: upload(PNG, "../../etc/passwd<script>.png", "image/png") });
    const { item } = await json<{ item: { url: string; filename: string } }>(r);
    expect(item.url).not.toContain("..");
    expect(item.url).toMatch(/^\/media\/uploads\/\d{4}\/\d{2}\/m_[a-z0-9]+-[a-z0-9-]+\.png$/);
    expect(item.filename).not.toMatch(/[<>/\\]/);
    expect((await call("/media/../wrangler.jsonc")).status).toBe(404);
  });

  it("refuses to delete files that are used on the website", async () => {
    const admin = await login((await createUser("admin")).email);
    const { item } = await json<{ item: { id: string; url: string } }>(
      await call("/api/admin/media", { method: "POST", session: admin, body: upload(PNG, "used.png", "image/png") }),
    );
    const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "Uses", path: "uses-image" } }));
    await call(`/api/admin/pages/${c.id}`, {
      method: "PUT",
      session: admin,
      body: { doc: { title: "Uses", seo: {}, blocks: [{ id: "b1", type: "image", image: { mediaId: item.id, src: item.url, alt: "x" }, size: "wide" }] } },
    });
    expect((await call(`/api/admin/media/${item.id}`, { method: "DELETE", session: admin })).status).toBe(409);
    await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: { title: "Uses", seo: {}, blocks: [] } } });
    expect((await call(`/api/admin/media/${item.id}`, { method: "DELETE", session: admin })).status).toBe(200);
  });
});

describe("CMS forms", () => {
  async function pageWithForm() {
    const admin = await login((await createUser("admin")).email);
    const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "Contact", path: "contact-test" } }));
    await call(`/api/admin/pages/${c.id}`, {
      method: "PUT",
      session: admin,
      body: {
        doc: {
          title: "Contact",
          seo: {},
          blocks: [
            {
              id: "f1",
              type: "form",
              title: "Write to us",
              fields: [
                { id: "name", label: "Name", type: "text", required: true },
                { id: "email", label: "Email", type: "email", required: true },
              ],
              submitLabel: "Send",
              successMessage: "Thanks!",
            },
          ],
        },
      },
    });
    await call(`/api/admin/pages/${c.id}/publish`, { method: "POST", session: admin });
    return admin;
  }

  it("stores valid submissions and only reports success after saving", async () => {
    const admin = await pageWithForm();
    const r = await call("/api/public/forms/submit", {
      method: "POST",
      body: { path: "contact-test", formId: "f1", values: { name: "Amina", email: "amina@example.org" }, turnstileToken: "pass" },
    });
    expect(r.status).toBe(200);
    expect((await json(r)).message).toBe("Thanks!");
    const subs = await json<{ submissions: { data: { label: string; value: string }[] }[] }>(await call("/api/admin/submissions", { session: admin }));
    expect(subs.submissions.some((s) => s.data.some((d) => d.value === "amina@example.org"))).toBe(true);
  });

  it("validates fields, requires Turnstile and ignores unknown forms", async () => {
    await pageWithForm();
    expect(
      (
        await call("/api/public/forms/submit", {
          method: "POST",
          body: { path: "contact-test", formId: "f1", values: { name: "A", email: "not-an-email" }, turnstileToken: "pass" },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("/api/public/forms/submit", {
          method: "POST",
          body: { path: "contact-test", formId: "f1", values: { name: "A", email: "a@example.org" }, turnstileToken: "fail" },
        })
      ).status,
    ).toBe(400);
    expect(
      (await call("/api/public/forms/submit", { method: "POST", body: { path: "contact-test", formId: "nope", values: {}, turnstileToken: "pass" } })).status,
    ).toBe(404);
  });
});

describe("content import API", () => {
  const auth = { authorization: `Bearer ${env.IMPORT_TOKEN}` };
  const page = {
    path: "imported-page",
    sourceUrl: "https://www.myprojectusa.org/imported-page",
    publish: true,
    doc: { title: "Imported", seo: {}, blocks: [] },
  };
  const entry = {
    collection: "events",
    slug: "imported-event",
    sourceUrl: "https://www.myprojectusa.org/events-1/x",
    sortOrder: 0,
    publish: true,
    doc: { title: "Imported event", data: { price: "Free" }, seo: {} },
  };

  it("is disabled without the import token", async () => {
    expect((await call("/api/import/content", { method: "POST", body: { pages: [page] } })).status).toBe(401);
    expect((await call("/api/import/content", { method: "POST", body: { pages: [page] }, headers: { authorization: "Bearer wrong" } })).status).toBe(401);
  });

  it("is idempotent and never overwrites staff edits", async () => {
    const first = await json<{ created: number; updated: number }>(
      await call("/api/import/content", {
        method: "POST",
        headers: auth,
        body: { pages: [page], entries: [entry], redirects: [{ from: "/events-1/x", to: "/events/imported-event" }] },
      }),
    );
    expect(first.created).toBe(2);
    const second = await json<{ created: number; updated: number }>(
      await call("/api/import/content", { method: "POST", headers: auth, body: { pages: [page], entries: [entry] } }),
    );
    expect(second.created).toBe(0);
    expect(second.updated).toBe(2);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE slug = 'imported-event'").first<{ n: number }>();
    expect(count?.n).toBe(1);
    expect((await call("/events-1/x")).headers.get("location")).toBe("/events/imported-event");

    // A person edits the page; re-import leaves it alone
    const admin = await login((await createUser("admin")).email);
    const pages = await json<{ pages: { id: string; path: string }[] }>(await call("/api/admin/pages", { session: admin }));
    const id = pages.pages.find((p) => p.path === "imported-page")!.id;
    await call(`/api/admin/pages/${id}`, { method: "PUT", session: admin, body: { doc: { title: "Edited by staff", seo: {}, blocks: [] } } });
    const third = await json<{ skipped: string[] }>(await call("/api/import/content", { method: "POST", headers: auth, body: { pages: [page] } }));
    expect(third.skipped.join()).toContain("imported-page");
  });

  it("serves published pages through the import → public pipeline", async () => {
    const admin = await login((await createUser("admin")).email);
    await publishedPage(admin, "pipeline", "Pipeline", "Imported text");
    const r = await call("/pipeline");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(ORIGIN).toBe("http://example.com");
  });
});
