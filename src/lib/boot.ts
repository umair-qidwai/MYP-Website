import type { PublicBootstrap } from "@shared/types";

/** Data the Worker embedded in the HTML for the first page view (no extra request needed). */
export function readBootstrap(): PublicBootstrap | null {
  const el = document.getElementById("__BOOT__");
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as PublicBootstrap;
  } catch {
    return null;
  }
}
