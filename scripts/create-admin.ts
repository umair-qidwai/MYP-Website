/**
 * Create the first administrator (or recover access) without ever handling a password here.
 *
 * Creates the user (if needed) with NO password and prints a one-time link (valid 72 hours) where
 * they choose their own password. The password is hashed by the Worker with the secret pepper.
 *
 *   npm run admin:create -- --email=you@example.org --name="Your Name"                (local dev DB)
 *   npm run admin:create -- --email=you@example.org --name="Your Name" --remote --url=https://www.myprojectusa.org
 *
 * Recovery: run the same command for an existing account to get a fresh password-reset link.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const email = String(args.email ?? "")
  .trim()
  .toLowerCase();
const name = String(args.name ?? "").trim();
const remote = args.remote === "true";
const baseUrl = String(args.url ?? (remote ? "" : "http://localhost:5180")).replace(/\/$/, "");
const role = args.role === "editor" ? "editor" : "admin";

if (!/^[^\s@'"]+@[^\s@'"]+\.[^\s@'"]+$/.test(email)) throw new Error("Pass a valid --email=...");
if (!name || name.length > 120) throw new Error('Pass --name="Full Name"');
if (remote && !baseUrl.startsWith("https://")) throw new Error("With --remote, pass --url=https://your-site so the link points at the live site.");

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const now = new Date().toISOString();
const expires = new Date(Date.now() + 72 * 3600_000).toISOString();
const userId = "u_" + randomUUID().replace(/-/g, "").slice(0, 20);

const sql = [
  `INSERT INTO users (id, email, name, role, can_publish, status, created_at, updated_at) VALUES (${q(userId)}, ${q(email)}, ${q(name)}, '${role}', 1, 'active', ${q(now)}, ${q(now)}) ON CONFLICT(email) DO UPDATE SET status = 'active', locked_until = NULL, failed_logins = 0`,
  `UPDATE password_tokens SET used_at = ${q(now)} WHERE used_at IS NULL AND user_id = (SELECT id FROM users WHERE email = ${q(email)})`,
  `INSERT INTO password_tokens (id, user_id, purpose, created_at, expires_at) SELECT ${q(tokenHash)}, id, CASE WHEN password_hash IS NULL THEN 'invite' ELSE 'reset' END, ${q(now)}, ${q(expires)} FROM users WHERE email = ${q(email)}`,
  `INSERT INTO audit_log (user_email, action, detail, created_at) VALUES ('cli', 'user.cli-link', ${q(email)}, ${q(now)})`,
].join("; ");

execFileSync("npx", ["wrangler", "d1", "execute", "myprojectusa", remote ? "--remote" : "--local", "--command", sql], {
  stdio: ["ignore", "ignore", "inherit"],
});

console.log(`\n✔ ${role === "admin" ? "Administrator" : "Editor"} account ready for ${email}`);
console.log("\nOpen this link to choose a password (works once, expires in 72 hours):\n");
console.log(`  ${baseUrl}/admin/set-password#token=${token}\n`);
console.log("Share it privately. It will not be shown again — run this command again for a new one.\n");
