import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: { port: 5180, strictPort: true, watch: { ignored: ["**/migration/**", "**/qa/**", "**/docs/**", "**/test-results/**"] } },
  preview: { port: 5181, strictPort: true },
  resolve: {
    alias: { "@shared": new URL("./shared", import.meta.url).pathname },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(three|@react-three)/.test(id)) return "three";
          if (/node_modules\/(@tiptap|prosemirror)/.test(id)) return "editor";
          if (/node_modules\/gsap/.test(id)) return "gsap";
        },
      },
    },
  },
});
