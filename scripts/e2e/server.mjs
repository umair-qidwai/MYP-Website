// Starts a dev server for end-to-end tests with a fresh, isolated local database and test accounts.
// Test accounts get one-time password links with fixed tokens; tests/e2e/global-setup.ts uses them.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";

const STATE = ".wrangler/e2e-state";
rmSync(STATE, { recursive: true, force: true });
const wrangler = (...args) => execFileSync("npx", ["wrangler", ...args, "--local", "--persist-to", STATE], { stdio: ["ignore", "ignore", "inherit"] });
wrangler("d1", "migrations", "apply", "myprojectusa");

const now = new Date().toISOString();
const later = new Date(Date.now() + 86400_000).toISOString();
const users = [
  ["u_e2e_admin", "admin@e2e.test", "E2E Admin", "admin", 1, "e2e-admin-token-0123456789abcdefghij"],
  ["u_e2e_editor", "editor@e2e.test", "E2E Editor", "editor", 0, "e2e-editor-token-0123456789abcdefghi"],
];
const sql = users
  .flatMap(([id, email, name, role, pub, token]) => [
    `INSERT INTO users (id, email, name, role, can_publish, status, created_at, updated_at) VALUES ('${id}', '${email}', '${name}', '${role}', ${pub}, 'active', '${now}', '${now}')`,
    `INSERT INTO password_tokens (id, user_id, purpose, created_at, expires_at) VALUES ('${createHash("sha256").update(token).digest("hex")}', '${id}', 'invite', '${now}', '${later}')`,
  ])
  .join("; ");
wrangler("d1", "execute", "myprojectusa", "--command", sql);

const child = spawn("npx", ["vite", "dev"], { stdio: "inherit", env: { ...process.env, E2E: "1" } });
const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => process.exit(code ?? 0));
