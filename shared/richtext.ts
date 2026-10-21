/**
 * Rich text is stored as a small, whitelisted subset of the Tiptap/ProseMirror JSON format —
 * never as raw HTML. Rendering walks this tree, so arbitrary markup or scripts can't be injected.
 */
import { z } from "zod";

export type Mark =
  | { type: "bold" | "italic" | "underline" | "strike" }
  | { type: "link"; attrs: { href: string; target?: "_blank" | null } };

export type RichNode =
  | { type: "text"; text: string; marks?: Mark[] }
  | { type: "hardBreak" }
  | { type: "horizontalRule" }
  | { type: "paragraph"; attrs?: { textAlign?: Align }; content?: RichNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 | 4; textAlign?: Align }; content?: RichNode[] }
  | { type: "bulletList" | "orderedList" | "listItem" | "blockquote"; content?: RichNode[] };

export type Align = "left" | "center" | "right" | null;
export type RichDoc = { type: "doc"; content: RichNode[] };

export const EMPTY_DOC: RichDoc = { type: "doc", content: [] };

/** Allowed link targets: web, email, phone, site-relative paths and in-page anchors. */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h || h.length > 2048) return false;
  if (h.startsWith("/") && !h.startsWith("//")) return true;
  if (h.startsWith("#")) return true;
  return /^(https?:|mailto:|tel:)/i.test(h);
}

const href = z.string().max(2048).refine(isSafeHref, "Links must start with https://, mailto:, tel: or /");
const align = z.enum(["left", "center", "right"]).nullable().optional();

const markSchema = z.union([
  z.object({ type: z.enum(["bold", "italic", "underline", "strike"]) }).strip(),
  z
    .object({
      type: z.literal("link"),
      attrs: z.object({ href, target: z.enum(["_blank"]).nullable().optional() }).strip(),
    })
    .strip(),
]);

const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), text: z.string().max(20000), marks: z.array(markSchema).max(6).optional() }).strip(),
    z.object({ type: z.literal("hardBreak") }).strip(),
    z.object({ type: z.literal("horizontalRule") }).strip(),
    z
      .object({
        type: z.literal("paragraph"),
        attrs: z.object({ textAlign: align }).strip().optional(),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
    z
      .object({
        type: z.literal("heading"),
        attrs: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]), textAlign: align }).strip(),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
    z
      .object({
        type: z.enum(["bulletList", "orderedList", "listItem", "blockquote"]),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
  ]),
) as z.ZodType<RichNode>;

export const richDocSchema = z.object({ type: z.literal("doc"), content: z.array(nodeSchema).max(5000) }).strip();

// ── Rendering to HTML (used server-side for SEO snapshots and RSS-like outputs) ─

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderMarks(text: string, marks: Mark[] = []): string {
  let out = escapeHtml(text);
  for (const m of marks) {
    switch (m.type) {
      case "bold":
        out = `<strong>${out}</strong>`;
        break;
      case "italic":
        out = `<em>${out}</em>`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "strike":
        out = `<s>${out}</s>`;
        break;
      case "link":
        if (isSafeHref(m.attrs.href)) {
          const ext = /^https?:/i.test(m.attrs.href);
          out = `<a href="${escapeHtml(m.attrs.href)}"${ext ? ' rel="noopener noreferrer" target="_blank"' : ""}>${out}</a>`;
        }
        break;
    }
  }
  return out;
}

export function richToHtml(doc: RichDoc | RichNode[] | undefined | null): string {
  if (!doc) return "";
  const nodes = Array.isArray(doc) ? doc : doc.content;
  return nodes.map(nodeToHtml).join("");
}

function nodeToHtml(n: RichNode): string {
  switch (n.type) {
    case "text":
      return renderMarks(n.text, n.marks);
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "paragraph":
      return `<p>${richToHtml(n.content ?? [])}</p>`;
    case "heading":
      return `<h${n.attrs.level}>${richToHtml(n.content ?? [])}</h${n.attrs.level}>`;
    case "bulletList":
      return `<ul>${richToHtml(n.content ?? [])}</ul>`;
    case "orderedList":
      return `<ol>${richToHtml(n.content ?? [])}</ol>`;
    case "listItem":
      return `<li>${richToHtml(n.content ?? [])}</li>`;
    case "blockquote":
      return `<blockquote>${richToHtml(n.content ?? [])}</blockquote>`;
  }
}

/** Plain text (for search, excerpts and meta descriptions). */
export function richToText(doc: RichDoc | RichNode[] | undefined | null): string {
  if (!doc) return "";
  const nodes = Array.isArray(doc) ? doc : doc.content;
  const walk = (n: RichNode): string => {
    if (n.type === "text") return n.text;
    if (n.type === "hardBreak") return "\n";
    if (n.type === "horizontalRule") return "\n";
    const inner = (n.content ?? []).map(walk).join("");
    return ["paragraph", "heading", "listItem", "blockquote"].includes(n.type) ? inner + "\n" : inner;
  };
  return nodes.map(walk).join("").replace(/\n{3,}/g, "\n\n").trim();
}

/** Convenience for building docs in code (seed data, tests). */
export function docFromParagraphs(...paras: string[]): RichDoc {
  return { type: "doc", content: paras.map((t) => ({ type: "paragraph", content: t ? [{ type: "text", text: t }] : [] })) };
}
