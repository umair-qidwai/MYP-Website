import { exports, env } from "cloudflare:workers";
import { hashPassword } from "../../worker/lib/password";

export const ORIGIN = "http://example.com";
export const PASSWORD = "A-long-test-password-2026";

let n = 0;
export async function createUser(role: "admin" | "editor", canPublish = false, password = PASSWORD) {
  const id = `u_test${++n}${Date.now().toString(36)}`;
  const email = `${id}@example.org`;
  const now = new Date().toISOString();
  const hash = await hashPassword(password, env.PASSWORD_PEPPER, 10000);
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, role, can_publish, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)",
  )
    .bind(id, email, `Test ${role}`, role, canPublish ? 1 : 0, hash, now, now)
    .run();
  return { id, email };
}

export type Session = { cookie: string; csrf: string };

let ip = 0;
/** Each test sign-in comes from its own client IP so the per-IP limiter doesn't interfere. */
export const freshIp = () => `198.51.100.${(++ip % 250) + 1}`;

export async function login(email: string, password = PASSWORD): Promise<Session> {
  const res = await call("/api/auth/login", { method: "POST", body: { email, password, turnstileToken: "pass" }, headers: { "cf-connecting-ip": freshIp() } });
  if (res.status !== 200) throw new Error(`login failed ${res.status}: ${await res.text()}`);
  const cookie = res.headers.get("set-cookie")!.split(";")[0];
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  return { cookie, csrf: csrfToken };
}

export async function call(
  path: string,
  opts: { method?: string; body?: unknown; session?: Session; csrf?: string | false; origin?: string | false; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.origin !== false) headers.origin = opts.origin ?? ORIGIN;
  if (opts.session) headers.cookie = opts.session.cookie;
  if (opts.session && opts.csrf !== false) headers["x-csrf-token"] = opts.csrf || opts.session.csrf;
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  return exports.default.fetch(new Request(ORIGIN + path, { method: opts.method ?? "GET", headers, body, redirect: "manual" }));
}

export const json = async <T = Record<string, unknown>>(r: Response) => (await r.json()) as T;

export const textDoc = (t: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] });

/** Create + publish a page through the API (as an admin). */
export async function publishedPage(admin: Session, path: string, title: string, text = "Hello world") {
  const c = await json<{ id: string }>(await call("/api/admin/pages", { method: "POST", session: admin, body: { title, path } }));
  await call(`/api/admin/pages/${c.id}`, {
    method: "PUT",
    session: admin,
    body: { doc: { title, seo: {}, blocks: [{ id: "b1", type: "richText", layout: "default", doc: textDoc(text) }] } },
  });
  await call(`/api/admin/pages/${c.id}/publish`, { method: "POST", session: admin });
  return c.id;
}
