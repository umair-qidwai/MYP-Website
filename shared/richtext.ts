/**
 * Rich text is stored as a small, whitelisted subset of the Tiptap/ProseMirror JSON format —
 * never as raw HTML. Rendering walks this tree, so arbitrary markup or scripts can't be injected.
 */

export type Mark = { type: "bold" | "italic" | "underline" | "strike" } | { type: "link"; attrs: { href: string; target?: "_blank" | null } };

export type RichNode =
  | { type: "text"; text: string; marks?: Mark[] }
  | { type: "hardBreak" }
  | { type: "horizontalRule" }
  | { type: "paragraph"; attrs?: { textAlign?: Align }; content?: RichNode[] }
  | {
      type: "heading";
      attrs: { level: 2 | 3 | 4; textAlign?: Align };
      content?: RichNode[];
    }
  | {
      type: "bulletList" | "orderedList" | "listItem" | "blockquote";
      content?: RichNode[];
    };

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
  return nodes
    .map(walk)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convenience for building docs in code (seed data, tests). */
export function docFromParagraphs(...paras: string[]): RichDoc {
  return {
    type: "doc",
    content: paras.map((t) => ({
      type: "paragraph",
      content: t ? [{ type: "text", text: t }] : [],
    })),
  };
}
