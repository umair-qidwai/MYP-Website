/** URL helpers shared by the importer, the API and the admin UI. */

export function slugify(input: string, max = 80): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Valid page path: lowercase segments of a-z, 0-9 and dashes separated by "/"; "" is the homepage. */
export const PAGE_PATH_RE = /^$|^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Paths the CMS can't use for pages because the application owns them. */
export const RESERVED_PATHS = ["admin", "api", "media", "assets", "static", "preview", "sitemap.xml", "robots.txt"];
/** Collection detail pages live under these prefixes (/events/<slug>, /blog/<slug>). The bare
 * prefix itself ("events", "blog") is an ordinary CMS page that lists the collection. */
export const COLLECTION_PREFIXES = ["events", "blog"];

export function isReservedPath(path: string): boolean {
  const [first, ...rest] = path.split("/");
  return RESERVED_PATHS.includes(first) || (COLLECTION_PREFIXES.includes(first) && rest.length > 0);
}

/** Normalise a request path for redirect lookups: decoded, lowercase, no trailing slash. */
export function normalizePath(pathname: string): string {
  let p = pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep raw */
  }
  p = p.toLowerCase().replace(/\/+$/, "");
  return p === "" ? "/" : p;
}
