/** Shapes exchanged between the Worker API and the browser. */
import type { PageDoc } from "./blocks";
import type { EntryDoc } from "./collections";
import type { Settings } from "./settings";

export type Role = "admin" | "editor";
export type Status = "draft" | "published" | "archived";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  canPublish: boolean;
};

/** Entry as embedded in public pages (published data only). */
export type PublicEntry = {
  id: string;
  collection: string;
  slug: string;
  title: string;
  date: string | null;
  data: Record<string, unknown>;
};

export type PublicPagePayload =
  | {
      kind: "page";
      path: string;
      page: PageDoc;
      collections: Record<string, PublicEntry[]>;
      /** Other language versions of this page (e.g. { es: "es/free-clinic", en: "free-clinic" }) */
      translations?: Record<string, string>;
      preview?: boolean;
    }
  | {
      kind: "entry";
      path: string;
      collection: string;
      entry: PublicEntry & { seo?: EntryDoc["seo"] };
      related: PublicEntry[];
      preview?: boolean;
    }
  | {
      kind: "collection";
      path: string;
      collection: string;
      entries: PublicEntry[];
    }
  | { kind: "notFound"; path: string };

export type PublicBootstrap = {
  settings: Settings;
  turnstileSiteKey: string;
  data: PublicPagePayload;
};

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
  variants: { w: number; url: string }[];
};
