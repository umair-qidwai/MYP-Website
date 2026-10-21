/** Site-wide settings, each stored as one row in the `settings` table. */
import { z } from "zod";
import { buttonSchema, imageSchema } from "./blocks";
import { isSafeHref } from "./richtext";

const text = (max = 500) => z.string().trim().max(max);
const href = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || isSafeHref(v), "Enter a full link (https://…) or a site path (/page)");

export const navItemSchema = z
  .object({
    label: text(80).min(1, "Menu items need a label"),
    href: href,
    children: z
      .array(z.object({ label: text(80).min(1), href }).strip())
      .max(20)
      .default([]),
  })
  .strip();
export type NavItem = z.infer<typeof navItemSchema>;

export const SETTINGS_SCHEMAS = {
  site: z
    .object({
      name: text(120).min(1),
      tagline: text(200).default(""),
      description: text(500).default(""),
      logo: imageSchema.optional(),
      banner: imageSchema.optional(), // "All are welcome" mosaic artwork from the original site header
      ogImage: imageSchema.optional(),
    })
    .strip(),
  contact: z
    .object({
      phone: text(60).default(""),
      email: text(200).default(""),
      visitAddress: text(300).default(""),
      mailAddress: text(300).default(""),
      taxId: text(60).default(""),
      copyright: text(200).default(""),
    })
    .strip(),
  social: z
    .object({
      links: z
        .array(
          z
            .object({
              platform: z.enum(["linkedin", "youtube", "facebook", "x", "instagram", "tiktok"]),
              url: href,
            })
            .strip(),
        )
        .max(12),
    })
    .strip(),
  navigation: z.object({ main: z.array(navItemSchema).max(16) }).strip(),
  quickLinks: z.object({ buttons: z.array(buttonSchema).max(8) }).strip(),
  programs: z
    .object({
      heading: text(120).default(""),
      items: z
        .array(
          z
            .object({
              name: text(120).min(1),
              image: imageSchema.optional(),
              href,
            })
            .strip(),
        )
        .max(24),
    })
    .strip(),
  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: text(300).default(""),
      href: href.default(""),
      linkLabel: text(60).default(""),
    })
    .strip(),
} as const;

export type SettingsKey = keyof typeof SETTINGS_SCHEMAS;
export type Settings = {
  [K in SettingsKey]: z.infer<(typeof SETTINGS_SCHEMAS)[K]>;
};
export const SETTINGS_KEYS = Object.keys(SETTINGS_SCHEMAS) as SettingsKey[];

export * from "./settings-defaults";
