/** The public form URL is more useful than an embed URL when opened separately. */
export function embedFallbackUrl(url: string, provider: string): string {
  try {
    const out = new URL(url);
    out.searchParams.delete("embedded");
    if (provider === "zeffy") out.pathname = out.pathname.replace("/embed/", "/");
    return out.href;
  } catch {
    return url; // An unfinished embed in the editor can have an empty address.
  }
}
