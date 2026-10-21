/**
 * Convert Wix rich-text HTML into the CMS's safe rich-text JSON.
 * Keeps wording, paragraphs, headings, lists, links, bold/italic/underline. Drops Wix styling
 * (fonts, sizes, colours) and empty spacer paragraphs.
 */
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";
import type { Mark, RichDoc, RichNode } from "../../shared/richtext";

export type LinkMapper = (href: string) => string | null;

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "div", "section"]);
// Zero-width characters Wix leaves in text
const ZW = /\u200b|\u200c|\u200d|\ufeff/g;

/** Known Wix template placeholder copy — not organisational content. */
export const WIX_PLACEHOLDERS = [
  /^I['’]m a paragraph\. Click here to add your own text/i,
  /^This is your Contact section paragraph/i,
  /^I['’]m a title\b/i,
  /^Add a Title$/i,
];

function isEl(n: ChildNode): n is Element {
  return n.type === "tag";
}

function styleOf(el: Element): string {
  return (el.attribs.style ?? "").toLowerCase();
}

function marksFor(el: Element, inherited: Mark[], mapLink: LinkMapper): Mark[] {
  const out = [...inherited];
  const st = styleOf(el);
  const has = (t: Mark["type"]) => out.some((m) => m.type === t);
  const remove = (t: Mark["type"]) => {
    const i = out.findIndex((m) => m.type === t);
    if (i >= 0) out.splice(i, 1);
  };
  if (["strong", "b"].includes(el.name) || /font-weight:\s*(bold|[6-9]00)/.test(st)) {
    if (!has("bold")) out.push({ type: "bold" });
  }
  if (/font-weight:\s*(normal|[1-4]00)/.test(st)) remove("bold");
  if (["em", "i"].includes(el.name) || /font-style:\s*italic/.test(st)) {
    if (!has("italic")) out.push({ type: "italic" });
  }
  if (el.name === "u" || /text-decoration:\s*underline/.test(st)) {
    if (!has("underline") && !has("link")) out.push({ type: "underline" });
  }
  if (el.name === "a" && el.attribs.href) {
    const href = mapLink(el.attribs.href);
    if (href) {
      remove("underline");
      out.push({ type: "link", attrs: { href, target: /^https?:/.test(href) ? "_blank" : null } });
    }
  }
  return out;
}

function inline(nodes: ChildNode[], marks: Mark[], mapLink: LinkMapper): RichNode[] {
  const out: RichNode[] = [];
  for (const n of nodes) {
    if (n.type === "text") {
      const text = n.data
        .replace(ZW, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t\r\n]+/g, " ");
      if (!text) continue;
      out.push(marks.length ? { type: "text", text, marks: dedupeMarks(marks) } : { type: "text", text });
    } else if (isEl(n)) {
      if (n.name === "br") out.push({ type: "hardBreak" });
      else if (["script", "style", "img", "svg", "iframe"].includes(n.name)) continue;
      else out.push(...inline(n.children, marksFor(n, marks, mapLink), mapLink));
    }
  }
  return out;
}

function dedupeMarks(m: Mark[]): Mark[] {
  const seen = new Set<string>();
  return m.filter((x) => (seen.has(x.type) ? false : (seen.add(x.type), true)));
}

/** Merge adjacent text nodes with identical marks; trim edges. */
function tidy(nodes: RichNode[]): RichNode[] {
  const out: RichNode[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (n.type === "text" && prev?.type === "text" && JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])) {
      prev.text += n.text;
    } else out.push(structuredClone(n));
  }
  // trim leading/trailing whitespace and breaks
  while (out.length && (out[0].type === "hardBreak" || (out[0].type === "text" && !out[0].text.trim()))) out.shift();
  while (
    out.length &&
    (out[out.length - 1].type === "hardBreak" || (out[out.length - 1].type === "text" && !(out[out.length - 1] as { text: string }).text.trim()))
  )
    out.pop();
  if (out[0]?.type === "text") out[0].text = out[0].text.replace(/^\s+/, "");
  const last = out[out.length - 1];
  if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
  return out.filter((n) => n.type !== "text" || n.text.length > 0);
}

/** "line<br><br>line" inside one <p> is how Wix often fakes paragraphs; make them real paragraphs. */
function splitOnDoubleBreaks(content: RichNode[]): RichNode[] {
  const paras: RichNode[][] = [[]];
  const blank = (x: RichNode | undefined) => x?.type === "text" && !x.text.trim();
  for (let i = 0; i < content.length; i++) {
    const n = content[i];
    if (n.type === "hardBreak") {
      // look past whitespace-only text for another break
      let j = i + 1;
      while (blank(content[j])) j++;
      if (content[j]?.type === "hardBreak") {
        while (content[j]?.type === "hardBreak" || blank(content[j])) j++;
        i = j - 1;
        paras.push([]);
        continue;
      }
    }
    paras[paras.length - 1].push(n);
  }
  return paras
    .map((p) => tidy(p))
    .filter((p) => textOf(p).trim())
    .map((p) => ({ type: "paragraph", content: p }) as RichNode);
}

const textOf = (nodes: RichNode[]) => nodes.map((n) => (n.type === "text" ? n.text : n.type === "hardBreak" ? "\n" : "")).join("");

function blocks(nodes: ChildNode[], mapLink: LinkMapper, removed: string[]): RichNode[] {
  const out: RichNode[] = [];
  let pending: ChildNode[] = []; // loose inline content between blocks
  const flush = () => {
    if (!pending.length) return;
    const content = tidy(inline(pending, [], mapLink));
    pending = [];
    if (textOf(content).trim()) out.push({ type: "paragraph", content });
  };
  for (const n of nodes) {
    if (!isEl(n) || !BLOCK_TAGS.has(n.name)) {
      pending.push(n);
      continue;
    }
    flush();
    switch (n.name) {
      case "p": {
        const content = tidy(inline(n.children, marksFor(n, [], mapLink), mapLink));
        const t = textOf(content).trim();
        if (!t) break;
        if (WIX_PLACEHOLDERS.some((re) => re.test(t))) {
          removed.push(t);
          break;
        }
        out.push(...splitOnDoubleBreaks(content));
        break;
      }
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const content = tidy(inline(n.children, [], mapLink)).map((x) =>
          x.type === "text" && x.marks ? { ...x, marks: x.marks.filter((m) => m.type !== "bold") } : x,
        );
        const t = textOf(content).trim();
        if (!t) break;
        if (WIX_PLACEHOLDERS.some((re) => re.test(t))) {
          removed.push(t);
          break;
        }
        // Provisional rank (normalised per page by normaliseHeadingLevels): h1/h2=2, h3=3, h4=4, h5=5, h6=6
        const level = n.name === "h1" || n.name === "h2" ? 2 : Number(n.name[1]);
        out.push({
          type: "heading",
          attrs: { level: level as 2 | 3 | 4 },
          content: content.map((x) => (x.type === "text" && x.marks?.length === 0 ? { type: "text", text: x.text } : x)),
        });
        break;
      }
      case "ul":
      case "ol": {
        const items: RichNode[] = [];
        for (const li of n.children.filter(isEl).filter((c) => c.name === "li")) {
          const inner = blocks(li.children, mapLink, removed);
          const content = inner.length ? inner : [];
          if (content.length && textOf(content.flatMap((c) => ("content" in c ? (c.content ?? []) : []))).trim()) items.push({ type: "listItem", content });
        }
        if (items.length) out.push({ type: n.name === "ul" ? "bulletList" : "orderedList", content: items });
        break;
      }
      case "blockquote": {
        const inner = blocks(n.children, mapLink, removed);
        if (inner.length) out.push({ type: "blockquote", content: inner });
        break;
      }
      default:
        out.push(...blocks(n.children, mapLink, removed));
    }
  }
  flush();
  return out;
}

/**
 * Wix commonly bolds whole body paragraphs as a visual style. Strip bold that spans an entire
 * long paragraph (it carries no emphasis meaning); keep inline emphasis and short bold lead-ins.
 */
function normaliseBodyBold(nodes: RichNode[]): RichNode[] {
  return nodes.map((n) => {
    if (n.type === "paragraph" && n.content) {
      const texts = n.content.filter((c) => c.type === "text") as { type: "text"; text: string; marks?: Mark[] }[];
      const all = texts.length > 0 && texts.every((t) => t.marks?.some((m) => m.type === "bold"));
      if (all && textOf(n.content).length > 120) {
        return { ...n, content: n.content.map((c) => (c.type === "text" ? stripMark(c, "bold") : c)) };
      }
    }
    if ((n.type === "bulletList" || n.type === "orderedList" || n.type === "listItem" || n.type === "blockquote") && n.content) {
      return { ...n, content: normaliseBodyBold(n.content) };
    }
    return n;
  });
}

function stripMark(t: { type: "text"; text: string; marks?: Mark[] }, type: Mark["type"]): RichNode {
  const marks = (t.marks ?? []).filter((m) => m.type !== type);
  return marks.length ? { type: "text", text: t.text, marks } : { type: "text", text: t.text };
}

/**
 * Wix pages often use a short, fully bold line as a section title ("Vision", "Our Services").
 * Promote those to real headings so the hierarchy is meaningful to screen readers and search engines.
 */
function promoteBoldLines(nodes: RichNode[]): RichNode[] {
  return nodes.map((n) => {
    if (n.type !== "paragraph" || !n.content?.length) return n;
    const texts = n.content.filter((c) => c.type === "text") as { type: "text"; text: string; marks?: Mark[] }[];
    if (texts.length !== n.content.filter((c) => c.type !== "hardBreak").length) return n;
    const t = textOf(n.content).trim();
    const allBold = texts.length > 0 && texts.every((x) => x.marks?.some((m) => m.type === "bold") && !x.marks?.some((m) => m.type === "link"));
    if (!allBold || t.length < 2 || t.length > 70 || /[.,:;]$/.test(t) || t.split(/\s+/).length > 9 || n.content.some((c) => c.type === "hardBreak")) return n;
    return { type: "heading", attrs: { level: 7 }, content: [{ type: "text", text: t }] } as unknown as RichNode; // rank below any real heading
  });
}

export function wixHtmlToDoc(html: string, mapLink: LinkMapper): { doc: RichDoc; removed: string[] } {
  const removed: string[] = [];
  const dom = parseDocument(html, { decodeEntities: true });
  const content = promoteBoldLines(normaliseBodyBold(blocks(dom.children, mapLink, removed)));
  return { doc: { type: "doc", content }, removed };
}

/**
 * Map the distinct provisional heading ranks used on a page onto levels 2–4, preserving their
 * relative order (the page title is the only h1).
 */
export function normaliseHeadingLevels(docs: RichDoc[]): void {
  const levels = new Set<number>();
  const walk = (nodes: RichNode[], fn: (n: RichNode) => void) => nodes.forEach((n) => (fn(n), "content" in n && n.content && walk(n.content, fn)));
  for (const d of docs) walk(d.content, (n) => n.type === "heading" && levels.add(n.attrs.level));
  const sorted = [...levels].sort((a, b) => a - b);
  const map = new Map(sorted.map((l, i) => [l, Math.min(2 + i, 4) as 2 | 3 | 4]));
  for (const d of docs) walk(d.content, (n) => n.type === "heading" && (n.attrs.level = map.get(n.attrs.level)!));
}

export function docText(doc: RichDoc): string {
  const walk = (n: RichNode): string =>
    n.type === "text"
      ? n.text
      : n.type === "hardBreak"
        ? "\n"
        : "content" in n && n.content
          ? n.content.map(walk).join("") + (["paragraph", "heading", "listItem"].includes(n.type) ? "\n" : "")
          : "";
  return doc.content.map(walk).join("");
}
