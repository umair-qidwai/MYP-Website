import { describe, expect, it } from "vitest";
import { call, createUser, json, login, publishedPage, textDoc } from "./helpers";

describe("authorization & CSRF", () => {
  it("blocks anonymous access to every admin API", async () => {
    for (const path of [
      "/api/admin/pages",
      "/api/admin/media",
      "/api/admin/settings",
      "/api/admin/users",
      "/api/admin/dashboard",
      "/api/admin/entries?collection=events",
    ]) {
      expect((await call(path)).status, path).toBe(401);
    }
  });

  it("requires the CSRF token for changes", async () => {
    const s = await login((await createUser("admin")).email);
    const res = await call("/api/admin/pages", { method: "POST", session: s, csrf: false, body: { title: "X", path: "csrf-test" } });
    expect(res.status).toBe(403);
    const wrong = await call("/api/admin/pages", { method: "POST", session: s, csrf: "not-the-token", body: { title: "X", path: "csrf-test" } });
    expect(wrong.status).toBe(403);
  });

  it("rejects cross-origin changes even with a session cookie", async () => {
    const s = await login((await createUser("admin")).email);
    const res = await call("/api/admin/pages", { method: "POST", session: s, origin: "https://evil.example", body: { title: "X", path: "origin-test" } });
    expect(res.status).toBe(403);
  });

  it("editors without publish permission can save drafts but not publish", async () => {
    const editor = await login((await createUser("editor", false)).email);
    const c = await json<{ id: string }>(
      await call("/api/admin/pages", { method: "POST", session: editor, body: { title: "Editor page", path: "editor-page" } }),
    );
    const save = await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: editor, body: { doc: { title: "Editor page", seo: {}, blocks: [] } } });
    expect(save.status).toBe(200);
    expect((await call(`/api/admin/pages/${c.id}/publish`, { method: "POST", session: editor })).status).toBe(403);
  });

  it("editors with publish permission can publish", async () => {
    const editor = await login((await createUser("editor", true)).email);
    const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: editor, body: { title: "Pub", path: "pub-editor" } }));
    expect((await call(`/api/admin/pages/${c.id}/publish`, { method: "POST", session: editor })).status).toBe(200);
  });

  it("editors cannot manage users, redirects, submissions or protected settings", async () => {
    const editor = await login((await createUser("editor", true)).email);
    expect((await call("/api/admin/users", { session: editor })).status).toBe(403);
    expect(
      (await call("/api/admin/users", { method: "POST", session: editor, body: { email: "x@example.org", name: "X", role: "admin", canPublish: true } }))
        .status,
    ).toBe(403);
    expect((await call("/api/admin/redirects", { session: editor })).status).toBe(403);
    expect((await call("/api/admin/submissions", { session: editor })).status).toBe(403);
    expect((await call("/api/admin/settings/navigation", { method: "PUT", session: editor, body: { main: [] } })).status).toBe(403);
    // ...but can edit everyday settings
    expect(
      (await call("/api/admin/settings/announcement", { method: "PUT", session: editor, body: { enabled: true, text: "Hi", href: "", linkLabel: "" } })).status,
    ).toBe(200);
  });

  it("editors cannot delete pages; admins can (to the bin) and restore them", async () => {
    const admin = await login((await createUser("admin")).email);
    const editor = await login((await createUser("editor", true)).email);
    const id = await publishedPage(admin, "to-delete", "Delete me");
    expect((await call(`/api/admin/pages/${id}`, { method: "DELETE", session: editor })).status).toBe(403);
    expect((await call(`/api/admin/pages/${id}`, { method: "DELETE", session: admin })).status).toBe(200);
    expect((await call("/api/public/page?path=to-delete")).status).toBe(404);
    expect((await call(`/api/admin/pages/${id}/restore`, { method: "POST", session: admin })).status).toBe(200);
  });

  it("there must always be an active administrator", async () => {
    const a = await createUser("admin");
    const admin = await login(a.email);
    const res = await call(`/api/admin/users/${a.id}`, {
      method: "PUT",
      session: admin,
      body: { name: "Me", role: "editor", canPublish: true, status: "active" },
    });
    expect(res.status).toBe(400);
  });

  it("never trusts a client-supplied role", async () => {
    const editor = await login((await createUser("editor", false)).email);
    const res = await call("/api/admin/pages", {
      method: "POST",
      session: editor,
      headers: { "x-role": "admin" },
      body: { title: "R", path: "role-test", role: "admin" },
    });
    expect(res.status).toBe(201);
    const id = (await json<{ id: string }>(res)).id;
    expect((await call(`/api/admin/pages/${id}/publish`, { method: "POST", session: editor })).status).toBe(403);
  });

  it("rejects unsafe links and unknown content in saved pages", async () => {
    const admin = await login((await createUser("admin")).email);
    const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "V", path: "validation" } }));
    const bad = {
      title: "V",
      seo: {},
      blocks: [
        {
          id: "b1",
          type: "richText",
          layout: "default",
          doc: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }],
          },
        },
      ],
    };
    expect((await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: bad } })).status).toBe(422);
    const script = {
      title: "V",
      seo: {},
      blocks: [{ id: "b1", type: "richText", layout: "default", doc: { type: "doc", content: [{ type: "script", text: "alert(1)" }] } }],
    };
    expect((await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: script } })).status).toBe(422);
    const embed = { title: "V", seo: {}, blocks: [{ id: "b1", type: "embed", provider: "other", url: "https://evil.example/x", title: "x", aspect: "16:9" }] };
    expect((await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: embed } })).status).toBe(422);
    const ok = { title: "V", seo: {}, blocks: [{ id: "b1", type: "richText", layout: "default", doc: textDoc("<script>alert(1)</script>") }] };
    expect((await call(`/api/admin/pages/${c.id}`, { method: "PUT", session: admin, body: { doc: ok } })).status).toBe(200);
  });

  it("rejects reserved page addresses", async () => {
    const admin = await login((await createUser("admin")).email);
    for (const path of ["admin", "api/x", "media", "events/foo"]) {
      expect((await call("/api/admin/pages", { method: "POST", session: admin, body: { title: "R", path } })).status, path).toBe(422);
    }
  });
});
