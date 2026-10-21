import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// End-to-end tests run their own dev server with an isolated local database (see scripts/e2e/server.mjs)
const e2e = process.env.E2E === "1";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(e2e ? { persistState: { path: ".wrangler/e2e-state" } } : {})],
  server: {
    port: e2e ? 5190 : 5180,
    strictPort: true,
    watch: { ignored: ["**/migration/**", "**/qa/**", "**/docs/**", "**/test-results/**", "**/playwright-report/**"] },
  },
  preview: { port: 5181, strictPort: true },
  resolve: {
    alias: { "@shared": new URL("./shared", import.meta.url).pathname },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(@tiptap|prosemirror)/.test(id)) return "editor";
        },
      },
    },
  },
});
