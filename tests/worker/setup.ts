import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, vi } from "vitest";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    TEST_MIGRATIONS: D1Migration[];
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, (env as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS);
});

// Turnstile: tokens equal to "pass" succeed, anything else fails. No real network calls.
const realFetch = globalThis.fetch;
vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://challenges.cloudflare.com/turnstile/")) {
    const form = init?.body as FormData;
    return Response.json({ success: form?.get("response") === "pass" });
  }
  return realFetch(input, init);
});
