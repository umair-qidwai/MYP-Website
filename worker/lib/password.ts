/**
 * Password hashing with PBKDF2-HMAC-SHA256 (WebCrypto, native in Workers).
 *
 * - The password is first keyed with a server-side secret "pepper" (HMAC), so a leaked
 *   database alone is not enough to brute-force hashes offline.
 * - Workers caps PBKDF2 at 100,000 iterations; the count is stored with each hash so it can be
 *   raised later and old hashes are upgraded transparently on the next successful login.
 * Format: pbkdf2-sha256$<iterations>$<salt b64>$<hash b64>
 */
import { b64, fromB64, safeEqual } from "./util";

const MAX_ITERATIONS = 100_000;

async function derive(password: string, pepper: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const pepperKey = await crypto.subtle.importKey("raw", enc.encode(pepper || "no-pepper"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const peppered = new Uint8Array(await crypto.subtle.sign("HMAC", pepperKey, enc.encode(password.normalize("NFKC"))));
  const key = await crypto.subtle.importKey("raw", peppered, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export function iterationsFromEnv(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 10_000 ? Math.min(Math.floor(n), MAX_ITERATIONS) : MAX_ITERATIONS;
}

export async function hashPassword(password: string, pepper: string, iterations: number): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, pepper, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string, pepper: string): Promise<{ ok: boolean; iterations: number }> {
  const [alg, it, saltB64, hashB64] = stored.split("$");
  const iterations = Number(it);
  if (alg !== "pbkdf2-sha256" || !Number.isFinite(iterations) || !saltB64 || !hashB64) return { ok: false, iterations: 0 };
  const hash = await derive(password, pepper, fromB64(saltB64), Math.min(iterations, MAX_ITERATIONS));
  return { ok: safeEqual(b64(hash), hashB64), iterations };
}

/** Basic strength rules shown to users when they choose a password. */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is too long.";
  if (new Set(pw).size < 5) return "Use a less repetitive password.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Don't include your email name in the password.";
  // Reject passwords that are mostly a word attackers try first (e.g. "admin12345", "Password123!")
  const common = ["password", "123456", "qwerty", "letmein", "welcome", "myprojectusa", "admin"];
  const lower = pw.toLowerCase();
  if (common.some((c) => lower.includes(c) && c.length * 2 >= pw.length)) return "That password is too easy to guess.";
  return null;
}
