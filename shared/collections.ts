/**
 * Repeatable content types. Each collection gets a list/edit screen in the admin and,
 * when `publicPath` is set, its own public listing and detail pages.
 * Field definitions drive both server validation and the admin form.
 */
import { z } from "zod";
import { fileSchema, imageSchema } from "./blocks";
import { isSafeHref, richDocSchema } from "./richtext";

export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea"; required?: boolean; help?: string; max?: number }
  | { name: string; label: string; type: "richtext"; required?: boolean; help?: string }
  | { name: string; label: string; type: "date"; required?: boolean; help?: string }
  | { name: string; label: string; type: "image" | "file"; required?: boolean; help?: string }
  | { name: string; label: string; type: "link"; required?: boolean; help?: string }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; help?: string };

export type CollectionDef = {
  key: string;
  label: string; // plural, shown in admin sidebar
  singular: string;
  description: string;
  publicPath?: string; // e.g. "events" → /events/:slug
  sortBy: "date-desc" | "date-asc" | "manual";
  dateField?: string; // which field feeds sort_date
  fields: FieldDef[];
};

export const COLLECTIONS: CollectionDef[] = [
  {
    key: "events",
    label: "Events",
    singular: "Event",
    description: "Community events, drives, dinners, trainings and gatherings.",
    publicPath: "events",
    sortBy: "date-desc",
    dateField: "date",
    fields: [
      { name: "date", label: "Event date", type: "date", help: "Leave empty if the date is unknown." },
      { name: "time", label: "Time", type: "text", max: 120 },
      { name: "location", label: "Location", type: "text", max: 300 },
      { name: "price", label: "Price / admission", type: "text", max: 120, help: "For example: Free" },
      { name: "image", label: "Image", type: "image" },
      { name: "summary", label: "Short summary", type: "textarea", max: 600 },
      { name: "body", label: "Details", type: "richtext" },
      { name: "registerUrl", label: "Registration / ticket link", type: "link" },
      { name: "registerLabel", label: "Registration button text", type: "text", max: 60 },
    ],
  },
  {
    key: "articles",
    label: "Articles",
    singular: "Article",
    description: "Blog posts and articles written by MY Project USA.",
    publicPath: "blog",
    sortBy: "date-desc",
    dateField: "date",
    fields: [
      { name: "date", label: "Publish date", type: "date" },
      { name: "author", label: "Author", type: "text", max: 200 },
      { name: "image", label: "Cover image", type: "image" },
      { name: "summary", label: "Summary", type: "textarea", max: 600 },
      { name: "body", label: "Article", type: "richtext", required: true },
      { name: "tags", label: "Tags (comma separated)", type: "text", max: 500 },
    ],
  },
  {
    key: "news",
    label: "News Coverage",
    singular: "News story",
    description: "Stories about MY Project USA in newspapers, TV and online media.",
    sortBy: "manual",
    dateField: "date",
    fields: [
      { name: "outlet", label: "News outlet", type: "text", max: 200 },
      { name: "date", label: "Date", type: "date" },
      { name: "url", label: "Link to the story", type: "link" },
      { name: "image", label: "Image", type: "image" },
      { name: "summary", label: "Summary", type: "textarea", max: 2000 },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    singular: "Report",
    description: "Annual reports, impact reports, financial statements and tax filings.",
    sortBy: "manual",
    fields: [
      { name: "category", label: "Type", type: "select", options: ["Annual Report", "Impact Report", "Financial Statement", "Tax Return", "Newsletter", "Other"] },
      { name: "year", label: "Year", type: "text", max: 20 },
      { name: "file", label: "Document (PDF)", type: "file" },
      { name: "url", label: "…or link to the document", type: "link" },
      { name: "cover", label: "Cover image", type: "image" },
      { name: "summary", label: "Description", type: "textarea", max: 1000 },
    ],
  },
];

export const COLLECTION_KEYS = COLLECTIONS.map((c) => c.key);
export const getCollection = (key: string) => COLLECTIONS.find((c) => c.key === key);

const linkSchema = z.string().trim().max(2048).refine((v) => v === "" || isSafeHref(v), "Enter a full link starting with https://");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker").or(z.literal(""));

/** Build a zod schema for an entry's `data` from its collection's field list. */
export function entryDataSchema(def: CollectionDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "text":
      case "textarea":
        s = z.string().trim().max(f.max ?? 5000);
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
      seo: z.object({ description: z.string().trim().max(500).optional() }).strip().default({}),
    })
    .strip();

export type EntryDoc = { title: string; data: Record<string, unknown>; seo?: { description?: string } };
