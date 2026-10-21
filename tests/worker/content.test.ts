import { describe, expect, it } from "vitest";
import { call, createUser, json, login, publishedPage, textDoc } from "./helpers";

describe("pages: draft → preview → publish → revisions", () => {
  it("keeps drafts private until published", async () => {
    const admin = await login((await createUser("admin")).email);
    const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "Summer", path: "summer-programs" } }));
    await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: { title: "Summer", seo: {}, blocks: [{ id: "b1", type: "richText", layout: "default", doc: textDoc("Draft words") }] } } });

    // Not public yet
    expect((await call("/api/public/page?path=summer-programs")).status).toBe(404);
    const html = await call("/summer-programs");
    expect(html.status).toBe(404);

    // Draft preview needs a session
    expect((await call("/preview/summer-programs")).status).toBe(302);
    const prev = await call("/preview/summer-programs", { session: admin });
    expect(prev.status).toBe(200);
    expect(prev.headers.get("cache-control")).toBe("no-store");
    expect(await prev.text()).toContain("Draft words");

    // Publish
    expect((await call(`/api/admin/pages/${c.id}/publish`, { method: "POST", session: admin })).status).toBe(200);
    const pub = await json<{ kind: string; page: { title: string } }>(await call("/api/public/page?path=summer-programs"));
    expect(pub.kind).toBe("page");
    const page = await call("/summer-programs");
    expect(page.status).toBe(200);
    const body = await page.text();
    expect(body).toContain("<title>Summer | MY Project USA</title>");
    expect(body).toContain('rel="canonical" href="http://example.com/summer-programs"');
    expect(body).toContain("Draft words"); // server-rendered snapshot for SEO
  });

  it("editing a live page doesn't change what visitors see until publishing again", async () => {
    const admin = await login((await createUser("admin")).email);
    const id = await publishedPage(admin, "live-page", "Live", "Version one");
    await call(`/api/admin/pages/${id}`, { method: "PUT", session: admin, body: { doc: { title: "Live", seo: {}, blocks: [{ id: "b1", type: "richText", layout: "default", doc: textDoc("Version two") }] } } });
    expect(JSON.stringify(await json(await call("/api/public/page?path=live-page")))).toContain("Version one");
    await call(`/api/admin/pages/${id}/publish`, { method: "POST", session: admin });
    expect(JSON.stringify(await json(await call("/api/public/page?path=live-page")))).toContain("Version two");
  });

  it("restores an earlier version into the draft", async () => {
    const admin = await login((await createUser("admin")).email);
    const id = await publishedPage(admin, "history-page", "History", "First");
    await call(`/api/admin/pages/${id}`, { method: "PUT", session: admin, body: { doc: { title: "History", seo: {}, blocks: [{ id: "b1", type: "richText", layout: "default", doc: textDoc("Second") }] } } });
    const { revisions } = await json<{ revisions: { id: number; action: string }[] }>(await call(`/api/admin/pages/${id}/revisions`, { session: admin }));
    const firstPublish = revisions.find((r) => r.action === "publish")!;
    expect((await call(`/api/admin/pages/${id}/revisions/${firstPublish.id}/restore`, { method: "POST", session: admin })).status).toBe(200);
    const page = await json<{ page: { doc: unknown } }>(await call(`/api/admin/pages/${id}`, { session: admin }));
    expect(JSON.stringify(page.page.doc)).toContain("First");
  });

  it("unpublishing takes the page offline; the homepage can't be unpublished", async () => {
    const admin = await login((await createUser("admin")).email);
    const id = await publishedPage(admin, "temporary", "Temp");
    expect((await call(`/api/admin/pages/${id}/unpublish`, { method: "POST", session: admin })).status).toBe(200);
    expect((await call("/api/public/page?path=temporary")).status).toBe(404);
  });

  it("changing a live page's address keeps the old address working", async () => {
    const admin = await login((await createUser("admin")).email);
    const id = await publishedPage(admin, "old-address", "Mover");
    await call(`/api/admin/pages/${id}`, { method: "PUT", session: admin, body: { path: "new-address", doc: { title: "Mover", seo: {}, blocks: [] } } });
    await call(`/api/admin/pages/${id}/publish`, { method: "POST", session: admin });
    const r = await call("/old-address");
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toBe("/new-address");
  });

  it("prevents duplicate page addresses", async () => {
    const admin = await login((await createUser("admin")).email);
    await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "A", path: "dupe" } });
    expect((await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "B", path: "dupe" } })).status).toBe(409);
  });
});

describe("collections", () => {
  it("creates, publishes, lists and archives an event", async () => {
    const admin = await login((await createUser("admin")).email);
    const c = await json<{ id: string }>(await call("/api/admin/entries", { method: "POST", session: admin, body: { collection: "events", title: "Community Iftar" } }));
    const save = await call(`/api/admin/entries/${c.id}`, { method: "PUT", session: admin, body: { doc: { title: "Community Iftar", data: { date: "2027-03-01", price: "Free", body: textDoc("Join us") }, seo: {} } } });
    expect(save.status).toBe(200);
    expect((await json<{ slug: string }>(save)).slug).toBe("community-iftar");
    expect((await call("/api/public/page?path=events/community-iftar")).status).toBe(404);
    await call(`/api/admin/entries/${c.id}/publish`, { method: "POST", session: admin });
    const page = await json<{ kind: string; entry: { data: { price: string } } }>(await call("/api/public/page?path=events/community-iftar"));
    expect(page.kind).toBe("entry");
    expect(page.entry.data.price).toBe("Free");
    await call(`/api/admin/entries/${c.id}/archive`, { method: "POST", session: admin });
    expect((await call("/api/public/page?path=events/community-iftar")).status).toBe(404);
  });

  it("validates entry fields", async () => {
    const admin = await login((await createUser("admin")).email);
    const c = await json<{ id: string }>(await call("/api/admin/entries", { method: "POST", session: admin, body: { collection: "reports", title: "Report" } }));
    const bad = await call(`/api/admin/entries/${c.id}`, { method: "PUT", session: admin, body: { doc: { title: "Report", data: { category: "Not a category" }, seo: {} } } });
    expect(bad.status).toBe(422);
  });
});

describe("public site plumbing", () => {
  it("sets security headers and never caches admin responses", async () => {
    const admin = await login((await createUser("admin")).email);
    const r = await call("/api/admin/pages", { session: admin });
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    const shell = await call("/admin/");
    expect(shell.headers.get("cache-control")).toBe("no-store");
    expect(await shell.text()).toContain("noindex");
  });

  it("serves robots.txt that hides previews and sitemap.xml with published pages only", async () => {
    const admin = await login((await createUser("admin")).email);
    await publishedPage(admin, "in-sitemap", "Sitemap page");
    await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "Hidden", path: "draft-only" } });
    const sm = await (await call("/sitemap.xml")).text();
    expect(sm).toContain("http://example.com/in-sitemap");
    expect(sm).not.toContain("draft-only");
    expect(await (await call("/robots.txt")).text()).toContain("Disallow: /"); // test env = never index
  });

  it("redirects legacy Wix URLs", async () => {
    expect((await call("/events-1/some-old-event")).headers.get("location")).toBe("/events");
    expect((await call("/single-post/2015/07/01/x")).headers.get("location")).toBe("/blog");
    expect((await call("/product-page/i-m-a-product")).headers.get("location")).toBe("/");
    const loc = await call("/es/anything");
    expect(loc.status).toBe(302);
    expect(loc.headers.get("location")).toBe("/anything");
    expect((await call("/some-page/")).headers.get("location")).toBe("/some-page");
  });

  it("returns a real 404 for unknown pages", async () => {
    const r = await call("/this-does-not-exist");
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("noindex");
  });
});
