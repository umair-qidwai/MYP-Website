import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@shared": path.resolve(__dirname, "../../shared") } },
  test: { include: ["tests/content/**/*.test.ts"], environment: "node", root: path.resolve(__dirname, "../..") },
});
