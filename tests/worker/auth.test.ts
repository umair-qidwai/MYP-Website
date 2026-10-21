import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, createUser, freshIp, json, login, PASSWORD } from "./helpers";

describe("authentication", () => {
  it("signs in with the right password and returns an HttpOnly, SameSite=Strict session cookie", async () => {
    const u = await createUser("admin");
    const res = await call("/api/auth/login", { method: "POST", body: { email: u.email, password: PASSWORD, turnstileToken: "pass" } });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    const body = await json<{ user: { email: string; role: string }; csrfToken: string }>(res);
    expect(body.user.role).toBe("admin");
    expect(body.csrfToken.length).toBeGreaterThan(20);
    // The raw session token is never stored — only its hash
    const token = cookie.split(";")[0].split("=")[1];
    const raw = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE id = ?").bind(token).first<{ n: number }>();
    expect(raw?.n).toBe(0);
  });

  it("rejects a wrong password with a generic message", async () => {
    const u = await createUser("editor");
    const res = await call("/api/auth/login", { method: "POST", body: { email: u.email, password: "wrong-password-123", turnstileToken: "pass" } });
    expect(res.status).toBe(401);
    expect((await json(res)).error).toMatch(/didn't work/);
  });

  it("gives the same answer for unknown emails (no account enumeration)", async () => {
    const res = await call("/api/auth/login", { method: "POST", body: { email: "nobody@example.org", password: "whatever-123456", turnstileToken: "pass" } });
    expect(res.status).toBe(401);
    expect((await json(res)).error).toMatch(/didn't work/);
  });

  it("requires a valid Turnstile token", async () => {
    const u = await createUser("admin");
    const res = await call("/api/auth/login", { method: "POST", body: { email: u.email, password: PASSWORD, turnstileToken: "fail" } });
    expect(res.status).toBe(400);
  });

  it("rejects cross-site login attempts", async () => {
    const u = await createUser("admin");
    const res = await call("/api/auth/login", { method: "POST", origin: "https://evil.example", body: { email: u.email, password: PASSWORD, turnstileToken: "pass" } });
    expect(res.status).toBe(403);
  });

  it("rate-limits sign-in attempts per IP address", async () => {
    const headers = { "cf-connecting-ip": "203.0.113.77" };
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await call("/api/auth/login", { method: "POST", headers, body: { email: `x${i}@example.org`, password: "nope-nope-nope", turnstileToken: "pass" } })).status;
    expect(last).toBe(429);
  });

  it("locks the account after repeated failures", async () => {
    const u = await createUser("editor");
    for (let i = 0; i < 5; i++) await call("/api/auth/login", { method: "POST", headers: { "cf-connecting-ip": freshIp() }, body: { email: u.email, password: "bad-password-xyz", turnstileToken: "pass" } });
    const res = await call("/api/auth/login", { method: "POST", headers: { "cf-connecting-ip": freshIp() }, body: { email: u.email, password: PASSWORD, turnstileToken: "pass" } });
    expect(res.status).toBe(429);
  });

  it("signs out and invalidates the session server-side", async () => {
    const u = await createUser("admin");
    const s = await login(u.email);
    expect((await call("/api/auth/me", { session: s })).status).toBe(200);
    expect((await call("/api/auth/logout", { method: "POST", session: s })).status).toBe(200);
    expect((await call("/api/auth/me", { session: s })).status).toBe(401);
    expect((await call("/api/admin/pages", { session: s })).status).toBe(401);
  });

  it("disabled users cannot use an existing session", async () => {
    const u = await createUser("editor");
    const s = await login(u.email);
    await env.DB.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").bind(u.id).run();
    expect((await call("/api/admin/pages", { session: s })).status).toBe(401);
  });

  it("invite links set a password once and then expire", async () => {
    const admin = await login((await createUser("admin")).email);
    const r = await json<{ link: string }>(await call("/api/admin/users", { method: "POST", session: admin, body: { email: "new.person@example.org", name: "New Person", role: "editor", canPublish: false } }));
    const token = r.link.split("#token=")[1];
    expect((await json(await call(`/api/auth/token?token=${token}`))).valid).toBe(true);
    const weak = await call("/api/auth/set-password", { method: "POST", body: { token, password: "short" } });
    expect(weak.status).toBe(422);
    const ok = await call("/api/auth/set-password", { method: "POST", body: { token, password: "orchard-lantern-river-77" } });
    expect(ok.status).toBe(200);
    const again = await call("/api/auth/set-password", { method: "POST", body: { token, password: "meadow-copper-signal-88" } });
    expect(again.status).toBe(400);
    await login("new.person@example.org", "orchard-lantern-river-77");
  });

  it("stores passwords as salted PBKDF2 hashes, never in plain text", async () => {
    const u = await createUser("editor");
    const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(u.id).first<{ password_hash: string }>();
    expect(row?.password_hash).toMatch(/^pbkdf2-sha256\$\d+\$/);
    expect(row?.password_hash).not.toContain(PASSWORD);
  });
});
