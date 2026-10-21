/** Server-side verification of Cloudflare Turnstile tokens (bot protection on login and forms). */
export async function verifyTurnstile(secret: string | undefined, token: string | undefined | null, ip: string): Promise<boolean> {
  if (!secret) return false; // fail closed: production must configure TURNSTILE_SECRET_KEY
  if (!token || token.length > 4096) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip && ip !== "local") body.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
