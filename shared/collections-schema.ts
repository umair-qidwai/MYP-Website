/** Validation for collection entries (server + admin only). */
import { z } from "zod";
import { fileSchema, imageSchema } from "./blocks";
import type { CollectionDef } from "./collections";
import { isSafeHref } from "./richtext";
import { richDocSchema } from "./richtext-schema";

const linkSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || isSafeHref(v), "Enter a full link starting with https://");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker")
  .or(z.literal(""));

/** Build a zod schema for an entry's `data` from its collection's field list. */
export function entryDataSchema(def: CollectionDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "text":
      case "textarea":
        s = z
          .string()
          .trim()
          .max(f.max ?? 5000);
        if (f.required) s = (s as z.ZodString).min(1, `${f.label} is required`);
        break;
      case "richtext":
        s = richDocSchema;
        break;
      case "date":
        s = dateSchema;
        break;
      case "image":
        s = imageSchema;
        break;
      case "file":
        s = fileSchema;
        break;
      case "link":
        s = linkSchema;
        break;
      case "select":
        s = z.enum(f.options as [string, ...string[]]).or(z.literal(""));
        break;
    }
    shape[f.name] = f.required ? s : s.optional();
  }
  return z.object(shape).strip();
}

export const entryDocSchema = (def: CollectionDef) =>
  z
    .object({
      title: z.string().trim().min(1, "Title is required").max(300),
      data: entryDataSchema(def),
      seo: z
        .object({ description: z.string().trim().max(500).optional() })
        .strip()
        .default({}),
    })
    .strip();
