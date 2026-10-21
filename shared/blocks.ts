/**
 * Page content model. A page is an ordered list of blocks; each block type has a strict schema.
 * Server-side validation uses these schemas on every save, so stored content is always well-formed.
 */
import { z } from "zod";
import { isSafeHref, type RichDoc } from "./richtext";
import { richDocSchema } from "./richtext-schema";
import { BLOOMERANG_RE, EMBED_PROVIDERS, isEmbeddable } from "./constants";

export * from "./constants";

const text = (max = 500) => z.string().trim().max(max);
const href = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || isSafeHref(v), "Enter a full link (https://…), an email (mailto:…) or a site path (/page)");

export const imageSchema = z
  .object({
    mediaId: z.string().max(64).optional(),
    src: z
      .string()
      .max(2048)
      .refine((v) => v.startsWith("/media/") || /^https:\/\//.test(v), "Invalid image URL"),
    alt: text(400).default(""),
    width: z.number().int().positive().max(20000).optional(),
    height: z.number().int().positive().max(20000).optional(),
    /** Smaller copies for responsive loading (srcset) */
    variants: z
      .array(
        z
          .object({
            w: z.number().int().positive().max(5000),
            src: z
              .string()
              .max(2048)
              .refine((v) => v.startsWith("/media/") || /^https:\/\//.test(v)),
          })
          .strip(),
      )
      .max(6)
      .optional(),
  })
  .strip();
export type ImageRef = z.infer<typeof imageSchema>;

export const fileSchema = z
  .object({
    mediaId: z.string().max(64).optional(),
    url: z
      .string()
      .max(2048)
      .refine((v) => v.startsWith("/media/") || /^https:\/\//.test(v), "Invalid file URL"),
    filename: text(300).optional(),
    size: z.number().int().nonnegative().optional(),
  })
  .strip();
export type FileRef = z.infer<typeof fileSchema>;

export const buttonSchema = z
  .object({
    label: text(120).min(1, "Button text is required"),
    href,
    style: z.enum(["primary", "secondary", "link"]).default("primary"),
  })
  .strip();
export type ButtonRef = z.infer<typeof buttonSchema>;

export const toneSchema = z.enum(["paper", "sand", "ink", "brand"]).default("paper");
export type Tone = z.infer<typeof toneSchema>;

const base = { id: z.string().min(1).max(64), hidden: z.boolean().optional() };

const formFieldSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_-]+$/i),
    label: text(200).min(1),
    type: z.enum(["text", "email", "tel", "textarea", "select", "checkbox"]),
    required: z.boolean().default(false),
    placeholder: text(200).optional(),
    options: z.array(text(200)).max(50).optional(),
  })
  .strip();
export type FormField = z.infer<typeof formFieldSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("hero"),
      // "sculpture" is a legacy value from an earlier design; it now renders like "image"
      variant: z.enum(["image", "plain", "sculpture"]).default("plain"),
      eyebrow: text(120).optional(),
      heading: text(300).min(1, "Add a heading"),
      body: richDocSchema.optional(),
      image: imageSchema.optional(),
      buttons: z.array(buttonSchema).max(4).default([]),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("richText"),
      layout: z.enum(["default", "lead", "wide", "columns"]).default("default"),
      tone: toneSchema.optional(),
      doc: richDocSchema,
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("statement"),
      text: text(600).min(1),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("image"),
      image: imageSchema,
      caption: text(500).optional(),
      link: href.optional(),
      size: z.enum(["medium", "wide", "full"]).default("wide"),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("gallery"),
      heading: text(200).optional(),
      layout: z.enum(["grid", "mosaic", "logos"]).default("grid"),
      images: z
        .array(
          z
            .object({
              image: imageSchema,
              caption: text(500).optional(),
              link: href.optional(),
            })
            .strip(),
        )
        .max(200),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("split"),
      heading: text(300).optional(),
      doc: richDocSchema,
      image: imageSchema.optional(),
      imageLink: href.optional(),
      imageSide: z.enum(["left", "right"]).default("right"),
      buttons: z.array(buttonSchema).max(4).default([]),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("cards"),
      heading: text(200).optional(),
      intro: text(1000).optional(),
      style: z.enum(["photo", "logo", "text"]).default("photo"),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
      items: z
        .array(
          z
            .object({
              title: text(200).default(""),
              text: text(4000).optional(),
              image: imageSchema.optional(),
              link: href.optional(),
              linkLabel: text(80).optional(),
            })
            .strip(),
        )
        .max(100),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("stats"),
      eyebrow: text(120).optional(),
      heading: text(200).optional(),
      items: z
        .array(
          z
            .object({
              value: text(40).min(1),
              label: text(200).min(1),
              note: text(300).optional(),
              group: text(80).optional(),
            })
            .strip(),
        )
        .max(24),
      /** Where the figures come from (shown under the numbers) */
      source: text(300).optional(),
      sourceLink: href.optional(),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("accordion"),
      heading: text(200).optional(),
      items: z.array(z.object({ title: text(300).min(1), doc: richDocSchema }).strip()).max(100),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("cta"),
      heading: text(300).min(1),
      text: text(1000).optional(),
      buttons: z.array(buttonSchema).max(6).default([]),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("quote"),
      text: text(2000).min(1),
      attribution: text(200).optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("timeline"),
      heading: text(200).optional(),
      items: z
        .array(
          z
            .object({
              date: text(80),
              title: text(200).min(1),
              text: text(2000).optional(),
            })
            .strip(),
        )
        .max(100),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("downloads"),
      heading: text(200).optional(),
      items: z
        .array(
          z
            .object({
              title: text(300).min(1),
              description: text(1000).optional(),
              file: fileSchema.optional(),
              url: href.optional(),
              image: imageSchema.optional(),
            })
            .strip(),
        )
        .max(200),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("embed"),
      provider: z.enum(EMBED_PROVIDERS).default("other"),
      url: z
        .string()
        .trim()
        .max(2048)
        .refine((v) => isEmbeddable(v) || BLOOMERANG_RE.test(v), "This website can't be embedded. Use a button link instead."),
      title: text(200).min(1, "Describe the embedded content"),
      aspect: z.enum(["16:9", "4:3", "1:1", "tall", "form"]).default("16:9"),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("programs"), // shows the initiatives list from Site settings › Programs
      heading: text(200).optional(),
      tone: toneSchema.optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("social"), // shows the social links from Site settings › Social
      heading: text(200).optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("video"),
      heading: text(200).optional(),
      videos: z
        .array(z.object({ file: fileSchema, caption: text(300).optional() }).strip())
        .min(1)
        .max(12),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("buttons"),
      buttons: z.array(buttonSchema).min(1).max(30),
      align: z.enum(["start", "center"]).default("start"),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("collection"),
      collection: z.string().max(40),
      heading: text(200).optional(),
      limit: z.number().int().min(1).max(500).default(12),
      display: z.enum(["grid", "list"]).default("grid"),
      filter: text(80).optional(),
    })
    .strip(),
  z
    .object({
      ...base,
      type: z.literal("form"),
      title: text(200).min(1),
      intro: text(2000).optional(),
      fields: z.array(formFieldSchema).min(1).max(30),
      submitLabel: text(60).default("Send"),
      successMessage: text(500).default("Thank you — your message has been received."),
      privacyNote: text(1000).optional(),
    })
    .strip(),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const seoSchema = z
  .object({
    title: text(200).optional(),
    description: text(500).optional(),
    image: imageSchema.optional(),
    noindex: z.boolean().optional(),
  })
  .strip();

export const pageDocSchema = z
  .object({
    title: text(200).min(1, "Every page needs a title"),
    lang: z.enum(["en", "ar", "es", "fr", "ht", "so"]).optional(),
    seo: seoSchema.default({}),
    hideTitle: z.boolean().optional(),
    intro: text(1000).optional(),
    blocks: z.array(blockSchema).max(300),
  })
  .strip();
export type PageDoc = z.infer<typeof pageDocSchema>;

export type { RichDoc };
