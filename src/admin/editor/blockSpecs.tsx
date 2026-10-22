import {
  AlignLeft,
  BarChart3,
  Columns2,
  FileDown,
  FormInput,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  LayoutGrid,
  ListCollapse,
  ListOrdered,
  Megaphone,
  MousePointerClick,
  PlaySquare,
  Quote,
  Rows3,
  Share2,
  Sparkles,
  Type,
  Video,
  Shapes,
} from "lucide-react";
import type { Block, BlockType } from "@shared/blocks";
import { EMBED_PROVIDERS, newBlockId } from "@shared/blocks";
import { COLLECTIONS } from "@shared/collections";
import type { FieldSpec } from "./fields";

const TONES: FieldSpec = {
  key: "tone",
  label: "Background",
  kind: "select",
  options: [
    { value: "paper", label: "Light (default)" },
    { value: "sand", label: "Warm sand" },
    { value: "ink", label: "Dark" },
    { value: "brand", label: "Purple" },
  ],
};
const doc = { type: "doc", content: [] };

export type BlockSpec = {
  type: BlockType;
  label: string;
  description: string;
  icon: typeof Type;
  fields: FieldSpec[];
  create: () => Block;
  summary: (b: Block) => string;
};

const text = (s: unknown) => (typeof s === "string" ? s : "");
const docText = (d: unknown): string => {
  const walk = (n: { type?: string; text?: string; content?: unknown[] }): string =>
    n.type === "text" ? (n.text ?? "") : (n.content ?? []).map((c) => walk(c as never)).join(" ");
  return d
    ? walk(d as never)
        .replace(/\s+/g, " ")
        .trim()
    : "";
};

export const BLOCK_SPECS: BlockSpec[] = [
  {
    type: "richText",
    label: "Text",
    description: "Paragraphs, headings, lists and links.",
    icon: AlignLeft,
    fields: [
      { key: "doc", label: "Text", kind: "rich" },
      {
        key: "layout",
        label: "Layout",
        kind: "select",
        options: [
          { value: "default", label: "Standard column" },
          { value: "lead", label: "Large introduction text" },
          { value: "wide", label: "Full width" },
          { value: "columns", label: "Two columns" },
        ],
      },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "richText", layout: "default", doc: { type: "doc", content: [] } }),
    summary: (b) => (b.type === "richText" ? docText(b.doc) : ""),
  },
  {
    type: "split",
    label: "Picture with text",
    description: "An image beside a heading, text and buttons.",
    icon: Columns2,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      { key: "doc", label: "Text", kind: "rich" },
      { key: "image", label: "Image", kind: "image" },
      { key: "imageLink", label: "When someone clicks the image, go to", kind: "link", optional: true },
      {
        key: "imageSide",
        label: "Image position",
        kind: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      { key: "buttons", label: "Buttons", kind: "buttons", max: 4 },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "split", doc: { type: "doc", content: [] }, imageSide: "left", buttons: [] }),
    summary: (b) => (b.type === "split" ? b.heading || docText(b.doc) : ""),
  },
  {
    type: "image",
    label: "Image",
    description: "A single picture, with an optional caption and link.",
    icon: ImageIcon,
    fields: [
      { key: "image", label: "Image", kind: "image" },
      { key: "caption", label: "Caption", kind: "text", optional: true },
      { key: "link", label: "Link", kind: "link", optional: true },
      {
        key: "size",
        label: "Size",
        kind: "select",
        options: [
          { value: "medium", label: "Medium" },
          { value: "wide", label: "Wide" },
          { value: "full", label: "Full width" },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "image", image: undefined as never, size: "wide" }),
    summary: (b) => (b.type === "image" ? b.caption || b.image?.alt || "" : ""),
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "A grid of photos or a wall of partner logos.",
    icon: GalleryHorizontalEnd,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "layout",
        label: "Style",
        kind: "select",
        options: [
          { value: "grid", label: "Photo grid" },
          { value: "logos", label: "Logo wall" },
        ],
      },
      {
        key: "images",
        label: "Pictures",
        kind: "list",
        itemLabel: "Picture",
        newItem: () => ({}),
        summary: (i) => text(i.caption) || text((i.image as { alt?: string } | undefined)?.alt),
        fields: [
          { key: "image", label: "Image", kind: "image" },
          { key: "caption", label: "Caption", kind: "text", optional: true },
          { key: "link", label: "Link", kind: "link", optional: true },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "gallery", layout: "grid", images: [] }),
    summary: (b) => (b.type === "gallery" ? `${b.heading ? b.heading + " · " : ""}${b.images.length} pictures` : ""),
  },
  {
    type: "hero",
    label: "Page introduction",
    description: "A big headline at the top of a page.",
    icon: Sparkles,
    fields: [
      { key: "eyebrow", label: "Small label above the headline", kind: "text", optional: true },
      { key: "heading", label: "Headline", kind: "text" },
      { key: "body", label: "Introduction", kind: "rich", optional: true },
      {
        key: "variant",
        label: "Style",
        kind: "select",
        options: [
          { value: "plain", label: "Headline only" },
          { value: "image", label: "Headline with a large photo" },
        ],
      },
      { key: "image", label: "Image", kind: "image", optional: true },
      { key: "buttons", label: "Buttons", kind: "buttons", max: 4 },
    ],
    create: () => ({ id: newBlockId(), type: "hero", variant: "plain", heading: "", buttons: [] }),
    summary: (b) => (b.type === "hero" ? b.heading : ""),
  },
  {
    type: "cards",
    label: "Cards",
    description: "A set of boxes — programs, people, services, partners.",
    icon: LayoutGrid,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      { key: "intro", label: "Introduction", kind: "textarea", optional: true, rows: 2 },
      {
        key: "style",
        label: "Card style",
        kind: "select",
        options: [
          { value: "photo", label: "With photos" },
          { value: "logo", label: "With logos" },
          { value: "text", label: "Text only" },
        ],
      },
      {
        key: "columns",
        label: "Cards per row",
        kind: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
      },
      {
        key: "items",
        label: "Cards",
        kind: "list",
        itemLabel: "Card",
        newItem: () => ({ title: "" }),
        summary: (i) => text(i.title),
        fields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "text", label: "Text", kind: "textarea", optional: true },
          { key: "image", label: "Image", kind: "image", optional: true },
          { key: "link", label: "Link", kind: "link", optional: true },
          { key: "linkLabel", label: "Link text", kind: "text", optional: true, placeholder: "Learn more" },
        ],
      },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "cards", style: "photo", columns: 3, items: [] }),
    summary: (b) => (b.type === "cards" ? `${b.heading ? b.heading + " · " : ""}${b.items.length} cards` : ""),
  },
  {
    type: "options",
    label: "Options with buttons",
    description: "Cards people choose from — ways to give, volunteer roles, contacts. Each has its own buttons.",
    icon: LayoutGrid,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      { key: "intro", label: "Introduction", kind: "textarea", optional: true, rows: 2 },
      {
        key: "columns",
        label: "Cards per row",
        kind: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ],
      },
      {
        key: "items",
        label: "Options",
        kind: "list",
        itemLabel: "Option",
        newItem: () => ({ title: "", buttons: [] }),
        summary: (i) => text(i.title) || "Option",
        fields: [
          { key: "eyebrow", label: "Small label above the title", kind: "text", optional: true },
          { key: "title", label: "Title", kind: "text", optional: true },
          { key: "doc", label: "Description", kind: "rich", optional: true },
          { key: "image", label: "Image", kind: "image", optional: true },
          { key: "imageLink", label: "Picture links to", kind: "link", optional: true },
          { key: "buttons", label: "Buttons", kind: "buttons", max: 4 },
        ],
      },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "options", columns: 2, items: [] }),
    summary: (b) => (b.type === "options" ? `${b.heading ? b.heading + " · " : ""}${b.items.length} options` : ""),
  },
  {
    type: "stats",
    label: "Impact numbers",
    description: "Big numbers with labels. Only use real, sourced figures.",
    icon: BarChart3,
    fields: [
      { key: "note", label: "", kind: "note", text: "Only publish figures that MY Project USA has verified, and say where they come from." },
      { key: "eyebrow", label: "Small label (e.g. years covered)", kind: "text", optional: true },
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "items",
        label: "Numbers",
        kind: "list",
        itemLabel: "Number",
        newItem: () => ({ value: "", label: "" }),
        summary: (i) => `${text(i.value)} ${text(i.label)}`,
        fields: [
          { key: "value", label: "Number", kind: "text", placeholder: "e.g. 310K or $7M" },
          { key: "label", label: "What it measures", kind: "text" },
          { key: "note", label: "Extra detail", kind: "text", optional: true },
          { key: "group", label: "Group (numbers with the same group appear together)", kind: "text", optional: true },
        ],
      },
      { key: "source", label: "Source of the figures", kind: "text", optional: true },
      { key: "sourceLink", label: "Source link", kind: "link", optional: true },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "stats", items: [] }),
    summary: (b) => (b.type === "stats" ? b.heading || `${b.items.length} numbers` : ""),
  },
  {
    type: "accordion",
    label: "Questions & answers",
    description: "Expandable sections — great for FAQs.",
    icon: ListCollapse,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "items",
        label: "Questions",
        kind: "list",
        itemLabel: "Question",
        newItem: () => ({ title: "", doc }),
        summary: (i) => text(i.title),
        fields: [
          { key: "title", label: "Question", kind: "text" },
          { key: "doc", label: "Answer", kind: "rich" },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "accordion", items: [] }),
    summary: (b) => (b.type === "accordion" ? b.heading || `${b.items.length} questions` : ""),
  },
  {
    type: "cta",
    label: "Call to action",
    description: "A bold band asking people to donate, volunteer or join.",
    icon: Megaphone,
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "text", label: "Text", kind: "textarea", optional: true, rows: 2 },
      { key: "buttons", label: "Buttons", kind: "buttons", max: 3 },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "cta", heading: "", buttons: [], tone: "brand" }),
    summary: (b) => (b.type === "cta" ? b.heading : ""),
  },
  {
    type: "buttons",
    label: "Buttons",
    description: "One or more buttons linking to pages, forms or donation sites.",
    icon: MousePointerClick,
    fields: [
      { key: "buttons", label: "Buttons", kind: "buttons", max: 30 },
      {
        key: "align",
        label: "Alignment",
        kind: "select",
        options: [
          { value: "start", label: "Left" },
          { value: "center", label: "Centre" },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "buttons", buttons: [{ label: "", href: "", style: "primary" }], align: "start" }),
    summary: (b) => (b.type === "buttons" ? b.buttons.map((x) => x.label).join(" · ") : ""),
  },
  {
    type: "statement",
    label: "Statement",
    description: "One big, memorable sentence.",
    icon: Type,
    fields: [{ key: "text", label: "Statement", kind: "textarea", rows: 2 }, TONES],
    create: () => ({ id: newBlockId(), type: "statement", text: "" }),
    summary: (b) => (b.type === "statement" ? b.text : ""),
  },
  {
    type: "quote",
    label: "Quote",
    description: "A quotation with the name of the person who said it.",
    icon: Quote,
    fields: [
      { key: "text", label: "Quote", kind: "textarea", rows: 3 },
      { key: "attribution", label: "Who said it", kind: "text", optional: true },
    ],
    create: () => ({ id: newBlockId(), type: "quote", text: "" }),
    summary: (b) => (b.type === "quote" ? b.text : ""),
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "Milestones in date order.",
    icon: ListOrdered,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "items",
        label: "Milestones",
        kind: "list",
        itemLabel: "Milestone",
        newItem: () => ({ date: "", title: "" }),
        summary: (i) => `${text(i.date)} ${text(i.title)}`,
        fields: [
          { key: "date", label: "Date or year", kind: "text" },
          { key: "title", label: "Title", kind: "text" },
          { key: "text", label: "Description", kind: "textarea", optional: true },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "timeline", items: [] }),
    summary: (b) => (b.type === "timeline" ? b.heading || `${b.items.length} milestones` : ""),
  },
  {
    type: "downloads",
    label: "Downloads",
    description: "A list of documents people can download.",
    icon: FileDown,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "items",
        label: "Documents",
        kind: "list",
        itemLabel: "Document",
        newItem: () => ({ title: "" }),
        summary: (i) => text(i.title),
        fields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "description", label: "Description", kind: "text", optional: true },
          { key: "file", label: "File", kind: "file", accept: "document", optional: true },
          { key: "url", label: "…or a link to the document", kind: "link", optional: true },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "downloads", items: [] }),
    summary: (b) => (b.type === "downloads" ? b.heading || `${b.items.length} documents` : ""),
  },
  {
    type: "collection",
    label: "List of events, articles, news or reports",
    description: "Automatically shows items from a collection — new items appear by themselves.",
    icon: Rows3,
    fields: [
      { key: "collection", label: "Show", kind: "select", options: COLLECTIONS.map((c) => ({ value: c.key, label: c.label })) },
      { key: "heading", label: "Heading", kind: "text", optional: true },
      { key: "limit", label: "How many to show", kind: "number", min: 1, max: 500 },
      {
        key: "display",
        label: "Display",
        kind: "select",
        options: [
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
        ],
      },
      {
        key: "filter",
        label: "Only reports of this type (reports only)",
        kind: "text",
        optional: true,
        help: "For example: Tax Return. Leave empty to show everything.",
      },
    ],
    create: () => ({ id: newBlockId(), type: "collection", collection: "events", limit: 12, display: "grid" }),
    summary: (b) =>
      b.type === "collection" ? `${COLLECTIONS.find((c) => c.key === b.collection)?.label ?? b.collection}${b.filter ? ` · ${b.filter}` : ""}` : "",
  },
  {
    type: "embed",
    label: "Video, form or map",
    description: "Embed a YouTube video, Google Form, Google Map, Eventbrite or Zeffy page.",
    icon: PlaySquare,
    fields: [
      {
        key: "provider",
        label: "Type",
        kind: "select",
        options: EMBED_PROVIDERS.map((p) => ({
          value: p,
          label: {
            youtube: "YouTube video",
            "google-form": "Google Form",
            "google-map": "Google Map",
            eventbrite: "Eventbrite",
            zeffy: "Zeffy",
            bloomerang: "Bloomerang sign-up form",
            "facebook-video": "Facebook video",
            other: "Other",
          }[p],
        })),
      },
      {
        key: "url",
        label: "Embed address",
        kind: "text",
        help: "For YouTube use https://www.youtube-nocookie.com/embed/VIDEO-ID. For Google Forms use the form's “embed” link.",
      },
      { key: "title", label: "Short description", kind: "text", help: "Read aloud to screen-reader users, e.g. “Volunteer sign-up form”." },
      {
        key: "aspect",
        label: "Shape",
        kind: "select",
        options: [
          { value: "16:9", label: "Widescreen video" },
          { value: "4:3", label: "Standard" },
          { value: "1:1", label: "Square" },
          { value: "tall", label: "Tall" },
          { value: "form", label: "Long form" },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "embed", provider: "youtube", url: "", title: "", aspect: "16:9" }),
    summary: (b) => (b.type === "embed" ? b.title : ""),
  },
  {
    type: "video",
    label: "Uploaded video",
    description: "Play MP4 videos uploaded to the media library.",
    icon: Video,
    fields: [
      { key: "heading", label: "Heading", kind: "text", optional: true },
      {
        key: "videos",
        label: "Videos",
        kind: "list",
        itemLabel: "Video",
        newItem: () => ({}),
        summary: (i) => text(i.caption) || text((i.file as { filename?: string } | undefined)?.filename),
        fields: [
          { key: "file", label: "Video file", kind: "file", accept: "video" },
          { key: "caption", label: "Caption", kind: "text", optional: true },
        ],
      },
    ],
    create: () => ({ id: newBlockId(), type: "video", videos: [] }),
    summary: (b) => (b.type === "video" ? b.heading || `${b.videos.length} videos` : ""),
  },
  {
    type: "form",
    label: "Contact / sign-up form",
    description: "A form whose answers are saved for administrators to read.",
    icon: FormInput,
    fields: [
      {
        key: "note",
        label: "",
        kind: "note",
        text: "Only ask for the information you really need. Submissions can be read by administrators under Form submissions.",
      },
      { key: "title", label: "Form title", kind: "text" },
      { key: "intro", label: "Introduction", kind: "textarea", optional: true, rows: 2 },
      {
        key: "fields",
        label: "Questions",
        kind: "list",
        itemLabel: "Question",
        newItem: () => ({ id: `field-${Math.random().toString(36).slice(2, 7)}`, label: "", type: "text", required: false }),
        summary: (i) => `${text(i.label) || "Untitled"}${i.required ? " *" : ""}`,
        fields: [
          { key: "label", label: "Question", kind: "text" },
          {
            key: "type",
            label: "Answer type",
            kind: "select",
            options: [
              { value: "text", label: "Short text" },
              { value: "email", label: "Email address" },
              { value: "tel", label: "Phone number" },
              { value: "textarea", label: "Long text" },
              { value: "select", label: "Choose from a list" },
              { value: "checkbox", label: "Tick box" },
            ],
          },
          { key: "required", label: "Required", kind: "toggle" },
          { key: "optionsText", label: "Choices (one per line, for “Choose from a list”)", kind: "textarea", optional: true, rows: 3 },
        ],
      },
      { key: "submitLabel", label: "Button text", kind: "text" },
      { key: "successMessage", label: "Message shown after sending", kind: "textarea", rows: 2 },
      { key: "privacyNote", label: "Privacy note", kind: "textarea", optional: true, rows: 2 },
    ],
    create: () => ({
      id: newBlockId(),
      type: "form",
      title: "",
      fields: [],
      submitLabel: "Send",
      successMessage: "Thank you — your submission has been received.",
    }),
    summary: (b) => (b.type === "form" ? b.title : ""),
  },
  {
    type: "programs",
    label: "Initiatives",
    description: "The initiative logos (edited in Site settings › Initiatives).",
    icon: Shapes,
    fields: [
      { key: "note", label: "", kind: "note", text: "The list of initiatives is shared across the whole site. Edit it in Site settings." },
      { key: "heading", label: "Heading", kind: "text", optional: true },
      TONES,
    ],
    create: () => ({ id: newBlockId(), type: "programs" }),
    summary: (b) => (b.type === "programs" ? (b.heading ?? "") : ""),
  },
  {
    type: "social",
    label: "Social media links",
    description: "Links to the organisation's social profiles (edited in Site settings).",
    icon: Share2,
    fields: [{ key: "heading", label: "Heading", kind: "text", optional: true }],
    create: () => ({ id: newBlockId(), type: "social", heading: "Stay Connected" }),
    summary: (b) => (b.type === "social" ? (b.heading ?? "") : ""),
  },
];

export const specFor = (t: BlockType) => BLOCK_SPECS.find((s) => s.type === t)!;

/** Form fields store choices as text in the editor; convert to/from the stored `options` array. */
export function toEditable(b: Block): Record<string, unknown> {
  const v = structuredClone(b) as Record<string, unknown>;
  if (b.type === "form") v.fields = b.fields.map((f) => ({ ...f, optionsText: (f.options ?? []).join("\n") }));
  if (b.type === "cards" || b.type === "options") v.columns = String(b.columns);
  return v;
}
export function fromEditable(v: Record<string, unknown>): Block {
  const b = structuredClone(v) as Record<string, unknown>;
  if (b.type === "form" && Array.isArray(b.fields)) {
    b.fields = (b.fields as Record<string, unknown>[]).map(({ optionsText, ...f }) => ({
      ...f,
      id:
        String(f.id || f.label || "field")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "field",
      ...(f.type === "select"
        ? {
            options: String(optionsText ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
    }));
  }
  if ((b.type === "cards" || b.type === "options") && typeof b.columns === "string") b.columns = Number(b.columns);
  delete b.note;
  return b as Block;
}
