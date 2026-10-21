import { z } from "zod";
import type { BlockOf, FormField, PageDoc } from "@shared/blocks";
import { createApp, HttpError } from "../app";
import { cachedPath, withMediaBase } from "../lib/content";
import { body } from "../lib/guards";
import { hit } from "../lib/ratelimit";
import { verifyTurnstile } from "../lib/turnstile";
import { clientIp, newId, nowIso, parseJson, sha256Hex } from "../lib/util";

export const publicRoutes = createApp();

publicRoutes.get("/page", async (c) => {
  const path = (c.req.query("path") ?? "").slice(0, 300);
  const payload = withMediaBase(await cachedPath(c.env, c.executionCtx, path), c.env.MEDIA_PUBLIC_BASE);
  c.header("Cache-Control", "public, max-age=30");
  return c.json(payload, payload.kind === "notFound" ? 404 : 200);
});

const submitSchema = z.object({
  path: z.string().max(300),
  formId: z.string().min(1).max(64),
  values: z.record(z.string().max(64), z.union([z.string().max(10000), z.boolean()])),
  turnstileToken: z.string().max(4096).optional(),
  website: z.string().max(200).optional(), // honeypot: must stay empty
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function validateField(f: FormField, raw: unknown): { value: string | boolean; error?: string } {
  if (f.type === "checkbox") {
    const v = raw === true || raw === "true" || raw === "on";
    return { value: v, error: f.required && !v ? `Please tick “${f.label}”.` : undefined };
  }
  const v = typeof raw === "string" ? raw.trim() : "";
  if (f.required && !v) return { value: v, error: `${f.label} is required.` };
  if (!v) return { value: "" };
  const max = f.type === "textarea" ? 5000 : 300;
  if (v.length > max) return { value: v, error: `${f.label} is too long.` };
  if (f.type === "email" && !EMAIL_RE.test(v)) return { value: v, error: "Please enter a valid email address." };
  if (f.type === "tel" && !/^[0-9+().\-\s]{6,30}$/.test(v)) return { value: v, error: "Please enter a valid phone number." };
  if (f.type === "select" && f.options && !f.options.includes(v)) return { value: v, error: `Please choose an option for ${f.label}.` };
  return { value: v };
}

/** Submissions to forms built in the CMS. Stored in D1 and visible to administrators. */
publicRoutes.post("/forms/submit", async (c) => {
  const input = await body(c.req.raw, submitSchema, 100_000);
  if (input.website) return c.json({ ok: true }); // silently drop bots that fill the honeypot

  const ip = clientIp(c.req.raw);
  const ipKey = await sha256Hex(`${ip}:${c.env.PASSWORD_PEPPER ?? ""}`);
  const rl = await hit(c.env.DB, `form:${ipKey}`, 6, 600);
  if (!rl.allowed) throw new HttpError(429, "You've sent several messages in a short time. Please try again in a few minutes.");

  if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, input.turnstileToken, ip))) {
    throw new HttpError(400, "We couldn't confirm you're human. Please try again.");
  }

  const path = input.path.replace(/^\/+|\/+$/g, "").toLowerCase();
  const row = await c.env.DB.prepare("SELECT published_json FROM pages WHERE path = ? AND status = 'published' AND deleted_at IS NULL")
    .bind(path)
    .first<{ published_json: string }>();
  const page = parseJson<PageDoc | null>(row?.published_json, null);
  const form = page?.blocks.find((b): b is BlockOf<"form"> => b.type === "form" && b.id === input.formId && !b.hidden);
  if (!form) throw new HttpError(404, "This form is no longer available.");

  const data: { label: string; value: string | boolean }[] = [];
  const errors: Record<string, string> = {};
  for (const f of form.fields) {
    const r = validateField(f, input.values[f.id]);
    if (r.error) errors[f.id] = r.error;
    data.push({ label: f.label, value: r.value });
  }
  if (Object.keys(errors).length) throw new HttpError(422, Object.values(errors)[0], errors);

  await c.env.DB.prepare("INSERT INTO form_submissions (id, form_id, form_title, page_path, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId("sub_"), form.id, form.title, path, JSON.stringify(data), nowIso())
    .run();
  return c.json({ ok: true, message: form.successMessage });
});
