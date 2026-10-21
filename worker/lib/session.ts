/**
 * Server-side sessions.
 * - The browser holds a random 256-bit token in an HttpOnly, SameSite=Strict cookie
 *   (Secure + __Host- prefix outside local development).
 * - The database stores only SHA-256(token), so a database leak doesn't expose live sessions.
 * - Every state-changing admin request must also send the per-session CSRF token header.
 */
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "../app";
import type { SessionUser } from "@shared/types";
import { nowIso, randomToken, safeEqual, sha256Hex } from "./util";

const IDLE_HOURS = 12; // session ends after 12h without activity
const MAX_DAYS = 7; // and in any case 7 days after login

export const isDev = (env: Env) => env.ENVIRONMENT === "development" || env.ENVIRONMENT === "test";
export const cookieName = (env: Env) => (isDev(env) ? "myp_session" : "__Host-myp_session");

export type SessionRow = { id: string; user_id: string; csrf_token: string; created_at: string; expires_at: string; last_seen_at: string };

export async function createSession(c: Context<AppEnv>, userId: string): Promise<{ csrfToken: string }> {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const now = new Date();
  const expires = new Date(now.getTime() + IDLE_HOURS * 3600_000);
  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, csrf_token, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(await sha256Hex(token), userId, csrfToken, now.toISOString(), expires.toISOString(), now.toISOString(), (c.req.header("user-agent") ?? "").slice(0, 300))
    .run();
  setCookie(c, cookieName(c.env), token, {
    httpOnly: true,
    secure: !isDev(c.env),
    sameSite: "Strict",
    path: "/",
    maxAge: MAX_DAYS * 86400,
  });
  return { csrfToken };
}

export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, cookieName(c.env));
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256Hex(token)).run();
  deleteCookie(c, cookieName(c.env), { path: "/", secure: !isDev(c.env) });
}

/** Resolve the current user from the session cookie (or null). Extends idle expiry on activity. */
export async function loadSession(c: Context<AppEnv>): Promise<{ user: SessionUser; session: SessionRow } | null> {
  const token = getCookie(c, cookieName(c.env));
  if (!token || token.length > 100) return null;
  const id = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT s.id, s.user_id, s.csrf_token, s.created_at, s.expires_at, s.last_seen_at,
            u.email, u.name, u.role, u.can_publish, u.status
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  )
    .bind(id)
    .first<SessionRow & { email: string; name: string; role: "admin" | "editor"; can_publish: number; status: string }>();
  if (!row) return null;
  const now = Date.now();
  const hardLimit = new Date(row.created_at).getTime() + MAX_DAYS * 86400_000;
  if (new Date(row.expires_at).getTime() < now || hardLimit < now || row.status !== "active") {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }
  // Slide the idle window at most every 5 minutes to keep D1 writes low.
  if (now - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    const newExpiry = new Date(Math.min(now + IDLE_HOURS * 3600_000, hardLimit)).toISOString();
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?").bind(nowIso(), newExpiry, id).run(),
    );
  }
  return {
    user: { id: row.user_id, email: row.email, name: row.name, role: row.role, canPublish: row.role === "admin" || row.can_publish === 1 },
    session: row,
  };
}

/** Same-origin check for state-changing requests (defence in depth alongside the CSRF token). */
export function sameOrigin(c: Context<AppEnv>): boolean {
  const origin = c.req.header("origin");
  const host = new URL(c.req.url).host;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const fetchSite = c.req.header("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}

export function csrfOk(c: Context<AppEnv>, session: SessionRow): boolean {
  const header = c.req.header("x-csrf-token") ?? "";
  return header.length > 0 && safeEqual(header, session.csrf_token);
}
