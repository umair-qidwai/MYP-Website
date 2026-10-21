import { z } from "zod";
import { createApp, HttpError } from "../app";
import { audit } from "../lib/audit";
import { body, requireUser } from "../lib/guards";
import { hashPassword, iterationsFromEnv, passwordProblem, verifyPassword } from "../lib/password";
import { hit } from "../lib/ratelimit";
import { createSession, destroySession, loadSession, sameOrigin } from "../lib/session";
import { verifyTurnstile } from "../lib/turnstile";
import { clientIp, nowIso, sha256Hex } from "../lib/util";

export const authRoutes = createApp();

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// A fixed dummy hash keeps response timing similar for unknown emails.
const DUMMY_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  can_publish: number;
  password_hash: string | null;
  status: string;
  failed_logins: number;
  locked_until: string | null;
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().max(200),
  turnstileToken: z.string().max(4096).optional(),
});

authRoutes.post("/login", async (c) => {
  if (!sameOrigin(c)) throw new HttpError(403, "Invalid request origin.");
  const { email, password, turnstileToken } = await body(c.req.raw, loginSchema, 10_000);
  const ip = clientIp(c.req.raw);
  const ipKey = await sha256Hex(`${ip}:${c.env.PASSWORD_PEPPER ?? ""}`);

  const byIp = await hit(c.env.DB, `login:ip:${ipKey}`, 10, 900);
  if (!byIp.allowed) throw new HttpError(429, `Too many sign-in attempts. Please wait ${Math.ceil(byIp.retryAfter / 60)} minutes and try again.`);

  if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, turnstileToken, ip))) {
    throw new HttpError(400, "We couldn't confirm you're human. Please complete the check and try again.");
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, name, role, can_publish, password_hash, status, failed_logins, locked_until FROM users WHERE email = ?",
  )
    .bind(email)
    .first<UserRow>();

  const invalid = () => new HttpError(401, "That email and password combination didn't work.");

  if (!user || !user.password_hash || user.status !== "active") {
    await verifyPassword(password, DUMMY_HASH, c.env.PASSWORD_PEPPER ?? "");
    throw invalid();
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    throw new HttpError(
      429,
      `This account is temporarily locked after several failed attempts. Try again in ${LOCK_MINUTES} minutes, or ask an administrator.`,
    );
  }

  const { ok, iterations } = await verifyPassword(password, user.password_hash, c.env.PASSWORD_PEPPER ?? "");
  if (!ok) {
    const failed = user.failed_logins + 1;
    const lock = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
    await c.env.DB.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?")
      .bind(lock ? 0 : failed, lock, user.id)
      .run();
    if (lock) await audit(c.env.DB, { id: user.id, email: user.email }, "account.locked");
    throw invalid();
  }

  const target = iterationsFromEnv(c.env.PBKDF2_ITERATIONS);
  const rehash = iterations !== target ? await hashPassword(password, c.env.PASSWORD_PEPPER ?? "", target) : null;
  await c.env.DB.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ?, password_hash = COALESCE(?, password_hash) WHERE id = ?")
    .bind(nowIso(), rehash, user.id)
    .run();

  const { csrfToken } = await createSession(c, user.id);
  await audit(c.env.DB, { id: user.id, email: user.email }, "login");
  c.header("Cache-Control", "no-store");
  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, canPublish: user.role === "admin" || user.can_publish === 1 },
    csrfToken,
  });
});

/** Public, non-secret configuration for the sign-in screen. */
authRoutes.get("/config", (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY }, 200, { "Cache-Control": "public, max-age=300" }));

authRoutes.get("/me", async (c) => {
  c.header("Cache-Control", "no-store");
  const s = await loadSession(c);
  if (!s) return c.json({ user: null }, 401);
  return c.json({ user: s.user, csrfToken: s.session.csrf_token });
});

authRoutes.post("/logout", requireUser, async (c) => {
  await audit(c.env.DB, c.get("user"), "logout");
  await destroySession(c);
  return c.json({ ok: true });
});

const changeSchema = z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) });

authRoutes.post("/change-password", requireUser, async (c) => {
  const { currentPassword, newPassword } = await body(c.req.raw, changeSchema, 10_000);
  const me = c.get("user");
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(me.id).first<{ password_hash: string }>();
  if (!row?.password_hash || !(await verifyPassword(currentPassword, row.password_hash, c.env.PASSWORD_PEPPER ?? "")).ok) {
    throw new HttpError(400, "Your current password is incorrect.");
  }
  const problem = passwordProblem(newPassword, me.email);
  if (problem) throw new HttpError(422, problem);
  const hash = await hashPassword(newPassword, c.env.PASSWORD_PEPPER ?? "", iterationsFromEnv(c.env.PBKDF2_ITERATIONS));
  const sessionId = c.get("session").id;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(hash, nowIso(), me.id),
    // Sign out every other device
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").bind(me.id, sessionId),
  ]);
  await audit(c.env.DB, me, "password.changed");
  return c.json({ ok: true });
});

// ── Invite / reset links ─────────────────────────────────────────────────────

async function findToken(db: D1Database, token: string) {
  if (!token || token.length > 100) return null;
  return db
    .prepare(
      `SELECT t.id, t.user_id, t.purpose, t.expires_at, t.used_at, u.email, u.name, u.status
       FROM password_tokens t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
    )
    .bind(await sha256Hex(token))
    .first<{ id: string; user_id: string; purpose: string; expires_at: string; used_at: string | null; email: string; name: string; status: string }>();
}

authRoutes.get("/token", async (c) => {
  c.header("Cache-Control", "no-store");
  const t = await findToken(c.env.DB, c.req.query("token") ?? "");
  if (!t || t.used_at || new Date(t.expires_at).getTime() < Date.now() || t.status !== "active") {
    return c.json({ valid: false }, 404);
  }
  return c.json({ valid: true, email: t.email, name: t.name, purpose: t.purpose });
});

const setSchema = z.object({ token: z.string().max(100), password: z.string().max(200) });

authRoutes.post("/set-password", async (c) => {
  if (!sameOrigin(c)) throw new HttpError(403, "Invalid request origin.");
  const { token, password } = await body(c.req.raw, setSchema, 10_000);
  const ipKey = await sha256Hex(`${clientIp(c.req.raw)}:${c.env.PASSWORD_PEPPER ?? ""}`);
  if (!(await hit(c.env.DB, `setpw:${ipKey}`, 10, 900)).allowed) throw new HttpError(429, "Too many attempts. Please wait and try again.");
  const t = await findToken(c.env.DB, token);
  if (!t || t.used_at || new Date(t.expires_at).getTime() < Date.now() || t.status !== "active") {
    throw new HttpError(400, "This link has expired or was already used. Ask an administrator for a new one.");
  }
  const problem = passwordProblem(password, t.email);
  if (problem) throw new HttpError(422, problem);
  const hash = await hashPassword(password, c.env.PASSWORD_PEPPER ?? "", iterationsFromEnv(c.env.PBKDF2_ITERATIONS));
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?").bind(hash, nowIso(), t.user_id),
    c.env.DB.prepare("UPDATE password_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(nowIso(), t.user_id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(t.user_id),
  ]);
  await audit(c.env.DB, { id: t.user_id, email: t.email }, t.purpose === "invite" ? "invite.accepted" : "password.reset");
  return c.json({ ok: true });
});
