import type { PublicPagePayload } from "@shared/types";

const cache = new Map<string, { at: number; data: PublicPagePayload }>();
const TTL = 60_000;

export function primePage(path: string, data: PublicPagePayload) {
  cache.set(path, { at: Date.now(), data });
}

export async function fetchPage(path: string, signal?: AbortSignal): Promise<PublicPagePayload> {
  const key = path.replace(/^\/+|\/+$/g, "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(`/api/public/page?path=${encodeURIComponent(key)}`, { signal, headers: { accept: "application/json" } });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to load page (${res.status})`);
  const data = (await res.json()) as PublicPagePayload;
  cache.set(key, { at: Date.now(), data });
  return data;
}

export type ApiError = { error: string; details?: unknown };

export async function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({ error: "Unexpected response from the server." }))) as T & ApiError;
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status, details: data.details });
  return data;
}
