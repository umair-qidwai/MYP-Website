import type { MiddlewareHandler } from "hono";
import type { z } from "zod";
import { HttpError, type AppEnv } from "../app";
import { csrfOk, loadSession, sameOrigin } from "./session";

/** Require a signed-in, active user. Mutating requests also require same-origin + CSRF token. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = await loadSession(c);
  if (!s) throw new HttpError(401, "Please sign in.");
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    if (!sameOrigin(c) || !csrfOk(c, s.session)) throw new HttpError(403, "Your session security check failed. Please reload the page.");
  }
  c.set("user", s.user);
  c.set("session", s.session);
  await next();
  c.header("Cache-Control", "no-store");
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get("user")?.role !== "admin") throw new HttpError(403, "Only administrators can do this.");
  await next();
};

export function assertCanPublish(c: { get: (k: "user") => AppEnv["Variables"]["user"] }) {
  if (!c.get("user").canPublish) throw new HttpError(403, "You don't have permission to publish. Ask an administrator.");
}

/** Parse + validate JSON body; throws a 422 with field messages on failure. */
export async function body<T extends z.ZodTypeAny>(req: Request, schema: T, maxBytes = 2_000_000): Promise<z.infer<T>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new HttpError(413, "That's too much content to save at once.");
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) throw new HttpError(413, "That's too much content to save at once.");
    raw = JSON.parse(text);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Invalid request.");
  }
  const r = schema.safeParse(raw);
  if (!r.success)
    throw new HttpError(
      422,
      friendlyIssue(r.error.issues[0]),
      r.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  return r.data;
}

function friendlyIssue(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return "Please check the form.";
  const where = issue.path.length ? ` (${issue.path.join(" › ")})` : "";
  return `${issue.message}${where}`;
}
