/** Plain constants shared by the public site, admin and Worker (no validation library). */

export const EMBED_PROVIDERS = ["youtube", "google-form", "google-map", "eventbrite", "zeffy", "bloomerang", "facebook-video", "other"] as const;

/** Hosts that may be embedded in an iframe. Anything else is shown as a link instead. */
export const EMBED_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "docs.google.com",
  "www.google.com",
  "maps.google.com",
  "calendar.google.com",
  "www.eventbrite.com",
  "eventbrite.com",
  "www.zeffy.com",
  "zeffy.com",
  "www.facebook.com",
  "player.vimeo.com",
  "www.nbc4i.com",
];

export function isEmbeddable(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && EMBED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

export const BLOOMERANG_RE = /^https:\/\/s3-us-west-2\.amazonaws\.com\/bloomerang-public-cdn\/myprojectusa\/\.widget-js\/\d+\.js$/;

export const LANGUAGES = {
  en: { label: "English", dir: "ltr" },
  ar: { label: "العربية", dir: "rtl" },
  es: { label: "Español", dir: "ltr" },
  fr: { label: "Français", dir: "ltr" },
  ht: { label: "Kreyòl ayisyen", dir: "ltr" },
  so: { label: "Soomaali", dir: "ltr" },
} as const;
export type Lang = keyof typeof LANGUAGES;
export const TRANSLATION_LANGS = ["ar", "es", "fr", "ht", "so"] as const;

export function newBlockId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return "b_" + [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}
