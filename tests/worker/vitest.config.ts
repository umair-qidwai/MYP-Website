import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const root = path.resolve(__dirname, "../..");

// The Worker serves HTML through its ASSETS binding; tests only need a minimal shell.
const assets = path.join(root, "dist/client");
if (!existsSync(path.join(assets, "index.html"))) {
  mkdirSync(assets, { recursive: true });
  writeFileSync(path.join(assets, "index.html"), '<!doctype html><html><head><title>t</title></head><body><div id="root"></div></body></html>');
}

export default defineConfig({
  resolve: { alias: { "@shared": path.join(root, "shared") } },
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: path.join(root, "wrangler.jsonc") },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.join(root, "migrations")),
          ENVIRONMENT: "test",
          PUBLIC_SITE_URL: "http://example.com",
          TURNSTILE_SECRET_KEY: "test-turnstile-secret",
          PASSWORD_PEPPER: "test-pepper-0123456789",
          IMPORT_TOKEN: "test-import-token-0123456789abcdef",
          PBKDF2_ITERATIONS: "10000",
          MEDIA_PUBLIC_BASE: "",
        },
      },
    })),
  ],
  test: {
    include: ["tests/worker/**/*.test.ts"],
    setupFiles: ["tests/worker/setup.ts"],
    root,
  },
});
