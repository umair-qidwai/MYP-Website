/** Settings, users, redirects, form submissions, dashboard and activity log. */
import { z } from "zod";
import { ADMIN_ONLY_SETTINGS, SETTINGS_KEYS, SETTINGS_SCHEMAS, type SettingsKey } from "@shared/settings";
import { normalizePath } from "@shared/slug";
import { createApp, HttpError } from "../../app";
import { audit } from "../../lib/audit";
import { getSettings, purge } from "../../lib/content";
import { body, requireAdmin } from "../../lib/guards";
import { toMediaItem, type MediaRow } from "../../lib/media";
import { pruneRateLimits } from "../../lib/ratelimit";
import { addRevision } from "../../lib/revisions";
import { newId, nowIso, parseJson, randomToken, sha256Hex } from "../../lib/util";

export const siteRoutes = createApp();

// ── Dashboard ────────────────────────────────────────────────────────────────
siteRoutes.get("/dashboard", async (c) => {
  const db = c.env.DB;
  const [pages, entries, media, subs, recent, uploads] = await db.batch([
    db.prepare("SELECT status, SUM(has_changes) AS changed, COUNT(*) AS n FROM pages WHERE deleted_at IS NULL GROUP BY status"),
    db.prepare("SELECT collection, status, COUNT(*) AS n FROM entries WHERE deleted_at IS NULL GROUP BY collection, status"),
    db.prepare("SELECT COUNT(*) AS n FROM media WHERE deleted_at IS NULL"),
    db.prepare("SELECT COUNT(*) AS n FROM form_submissions WHERE status = 'new'"),
    db.prepare(
      "SELECT action, entity_type, entity_id, detail, user_email, created_at FROM audit_log WHERE action NOT IN ('login','logout') ORDER BY id DESC LIMIT 12",
    ),
    db.prepare(
      "SELECT id, r2_key, filename, mime, size, width, height, alt, variants_json, created_at FROM media WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8",
    ),
  ]);
  const pageStats = { published: 0, draft: 0, archived: 0, unpublishedChanges: 0 };
  for (const r of pages.results as { status: keyof typeof pageStats; n: number; changed: number }[]) {
    pageStats[r.status] = r.n;
    if (r.status === "published") pageStats.unpublishedChanges = r.changed ?? 0;
  }
  // Pruning piggybacks on dashboard loads to avoid a scheduled job
  c.executionCtx.waitUntil(Promise.all([pruneRateLimits(db), db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()).run()]));
  return c.json({
    pages: pageStats,
    entries: entries.results,
    mediaCount: (media.results[0] as { n: number }).n,
    newSubmissions: c.get("user").role === "admin" ? (subs.results[0] as { n: number }).n : null,
    recent: recent.results,
    recentUploads: (uploads.results as MediaRow[]).map(toMediaItem),
  });
});

// ── Settings ─────────────────────────────────────────────────────────────────
siteRoutes.get("/settings", async (c) => c.json({ settings: await getSettings(c.env.DB) }));

siteRoutes.put("/settings/:key", async (c) => {
  const key = c.req.param("key") as SettingsKey;
  if (!SETTINGS_KEYS.includes(key)) throw new HttpError(404, "Unknown setting.");
  if (ADMIN_ONLY_SETTINGS.includes(key) && c.get("user").role !== "admin") throw new HttpError(403, "Only administrators can change this setting.");
  const value = await body(c.req.raw, SETTINGS_SCHEMAS[key]);
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at",
  )
    .bind(key, JSON.stringify(value), c.get("user").id, nowIso())
    .run();
  await addRevision(c.env.DB, "setting", key, "save", value, key, c.get("user").id);
  await audit(c.env.DB, c.get("user"), "settings.update", "setting", key);
  c.executionCtx.waitUntil(purge([], true));
  return c.json({ ok: true });
});

// ── Users (administrators only) ──────────────────────────────────────────────
const users = createApp();
users.use("*", requireAdmin);

users.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, name, role, can_publish, status, last_login_at, created_at, (password_hash IS NOT NULL) AS has_password FROM users ORDER BY name COLLATE NOCASE",
  ).all<{
    id: string;
    email: string;
    name: string;
    role: string;
    can_publish: number;
    status: string;
    last_login_at: string | null;
    created_at: string;
    has_password: number;
  }>();
  return c.json({
    users: results.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      canPublish: u.role === "admin" || u.can_publish === 1,
      status: u.status,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      invited: u.has_password === 0,
    })),
  });
});

async function issueLink(c: { env: Env; req: { url: string } }, userId: string, purpose: "invite" | "reset", createdBy: string) {
  const token = randomToken(32);
  const hours = purpose === "invite" ? 72 : 24;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE password_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(nowIso(), userId),
    c.env.DB.prepare("INSERT INTO password_tokens (id, user_id, purpose, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
      await sha256Hex(token),
      userId,
      purpose,
      createdBy,
      nowIso(),
      new Date(Date.now() + hours * 3600_000).toISOString(),
    ),
  ]);
  return { link: `${new URL(c.req.url).origin}/admin/set-password#token=${token}`, expiresInHours: hours };
}

const userSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  name: z.string().trim().min(1, "Enter a name").max(120),
  role: z.enum(["admin", "editor"]),
  canPublish: z.boolean().default(false),
});

users.post("/", async (c) => {
  const input = await body(c.req.raw, userSchema);
  const exists = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(input.email).first();
  if (exists) throw new HttpError(409, "Someone with that email already has an account.");
  const id = newId("u_");
  const now = nowIso();
  await c.env.DB.prepare("INSERT INTO users (id, email, name, role, can_publish, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)")
    .bind(id, input.email, input.name, input.role, input.canPublish ? 1 : 0, now, now)
    .run();
  const link = await issueLink(c, id, "invite", c.get("user").id);
  await audit(c.env.DB, c.get("user"), "user.invite", "user", id, `${input.email} (${input.role})`);
  return c.json({ id, ...link }, 201);
});

async function adminCount(db: D1Database) {
  return (await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'").first<{ n: number }>())?.n ?? 0;
}

users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = await body(
    c.req.raw,
    z.object({ name: z.string().trim().min(1).max(120), role: z.enum(["admin", "editor"]), canPublish: z.boolean(), status: z.enum(["active", "disabled"]) }),
  );
  const target = await c.env.DB.prepare("SELECT role, status FROM users WHERE id = ?").bind(id).first<{ role: string; status: string }>();
  if (!target) throw new HttpError(404, "User not found.");
  const losingAdmin = target.role === "admin" && target.status === "active" && (input.role !== "admin" || input.status !== "active");
  if (losingAdmin && (await adminCount(c.env.DB)) <= 1) throw new HttpError(400, "There must always be at least one active administrator.");
  if (id === c.get("user").id && (input.role !== "admin" || input.status !== "active"))
    throw new HttpError(400, "You can't remove your own administrator access.");
  await c.env.DB.prepare("UPDATE users SET name = ?, role = ?, can_publish = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(input.name, input.role, input.canPublish ? 1 : 0, input.status, nowIso(), id)
    .run();
  if (input.status === "disabled" || input.role !== target.role) await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  await audit(c.env.DB, c.get("user"), "user.update", "user", id, `${input.role}, publish=${input.canPublish}, ${input.status}`);
  return c.json({ ok: true });
});

users.post("/:id/reset-link", async (c) => {
  const id = c.req.param("id");
  const target = await c.env.DB.prepare("SELECT email FROM users WHERE id = ? AND status = 'active'").bind(id).first<{ email: string }>();
  if (!target) throw new HttpError(404, "User not found or disabled.");
  const link = await issueLink(c, id, "reset", c.get("user").id);
  await audit(c.env.DB, c.get("user"), "user.reset-link", "user", id, target.email);
  return c.json(link);
});

users.post("/:id/sign-out", async (c) => {
  await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(c.req.param("id")).run();
  await audit(c.env.DB, c.get("user"), "user.sign-out-all", "user", c.req.param("id"));
  return c.json({ ok: true });
});

siteRoutes.route("/users", users);

// ── Redirects (administrators only) ──────────────────────────────────────────
const redirects = createApp();
redirects.use("*", requireAdmin);

redirects.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, from_path, to_path, status_code, source, created_at FROM redirects ORDER BY source DESC, from_path LIMIT 2000",
  ).all();
  return c.json({ redirects: results });
});

const redirectSchema = z.object({
  from: z
    .string()
    .trim()
    .min(2)
    .max(500)
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), "Old address must start with /"),
  to: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((v) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\//.test(v), "New address must start with / or https://"),
  permanent: z.boolean().default(true),
});

redirects.post("/", async (c) => {
  const input = await body(c.req.raw, redirectSchema);
  const from = normalizePath(input.from);
  if (from === "/" || from.startsWith("/admin") || from.startsWith("/api")) throw new HttpError(400, "That address can't be redirected.");
  await c.env.DB.prepare(
    "INSERT INTO redirects (from_path, to_path, status_code, source, created_at) VALUES (?, ?, ?, 'manual', ?) ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, status_code = excluded.status_code",
  )
    .bind(from, input.to, input.permanent ? 301 : 302, nowIso())
    .run();
  await audit(c.env.DB, c.get("user"), "redirect.save", "redirect", from, input.to);
  return c.json({ ok: true });
});

redirects.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM redirects WHERE id = ?")
    .bind(Number(c.req.param("id")))
    .run();
  await audit(c.env.DB, c.get("user"), "redirect.delete", "redirect", c.req.param("id"));
  return c.json({ ok: true });
});

siteRoutes.route("/redirects", redirects);

// ── Form submissions (administrators only: may contain personal information) ─
const submissions = createApp();
submissions.use("*", requireAdmin);

submissions.get("/", async (c) => {
  const status = c.req.query("status") ?? "inbox";
  const where = status === "archived" ? "status = 'archived'" : "status != 'archived'";
  const { results } = await c.env.DB.prepare(
    `SELECT id, form_id, form_title, page_path, data_json, status, created_at FROM form_submissions WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
  ).all<{
    id: string;
    form_id: string;
    form_title: string;
    page_path: string;
    data_json: string;
    status: string;
    created_at: string;
  }>();
  return c.json({
    submissions: results.map((r) => ({
      id: r.id,
      formTitle: r.form_title,
      pagePath: r.page_path,
      status: r.status,
      createdAt: r.created_at,
      data: parseJson(r.data_json, []),
    })),
  });
});

submissions.put("/:id", async (c) => {
  const { status } = await body(c.req.raw, z.object({ status: z.enum(["new", "read", "archived"]) }));
  await c.env.DB.prepare("UPDATE form_submissions SET status = ? WHERE id = ?").bind(status, c.req.param("id")).run();
  return c.json({ ok: true });
});

submissions.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM form_submissions WHERE id = ?").bind(c.req.param("id")).run();
  await audit(c.env.DB, c.get("user"), "submission.delete", "submission", c.req.param("id"));
  return c.json({ ok: true });
});

siteRoutes.route("/submissions", submissions);

// ── Activity log (administrators only) ───────────────────────────────────────
siteRoutes.get("/activity", requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, user_email, action, entity_type, entity_id, detail, created_at FROM audit_log ORDER BY id DESC LIMIT 300",
  ).all();
  return c.json({ activity: results });
});
