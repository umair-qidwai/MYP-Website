import type { ReactNode } from "react";
import { isSafeHref, type Mark, type RichDoc, type RichNode } from "@shared/richtext";
import { slugify } from "@shared/slug";
import { SmartLink } from "./SmartLink";

const plain = (nodes: RichNode[] = []): string => nodes.map((n) => (n.type === "text" ? n.text : "content" in n ? plain(n.content) : "")).join("");

/** Section headings of a document (for "On this page" navigation). */
export function headingsOf(doc?: RichDoc | null): { id: string; text: string; level: number }[] {
  return (doc?.content ?? [])
    .filter((n): n is Extract<RichNode, { type: "heading" }> => n.type === "heading")
    .map((h) => ({ id: slugify(plain(h.content)) || "section", text: plain(h.content), level: h.attrs.level }));
}

/** Render stored rich text as React elements (no innerHTML — content can't inject markup). */
export function RichText({ doc, className = "prose-myp" }: { doc?: RichDoc | null; className?: string }) {
  if (!doc?.content?.length) return null;
  return <div className={className}>{doc.content.map((n, i) => renderNode(n, i))}</div>;
}

function renderMarks(text: string, marks: Mark[] | undefined, key: number): ReactNode {
  let node: ReactNode = text;
  for (const m of marks ?? []) {
    if (m.type === "bold") node = <strong key={key}>{node}</strong>;
    else if (m.type === "italic") node = <em key={key}>{node}</em>;
    else if (m.type === "underline") node = <u key={key}>{node}</u>;
    else if (m.type === "strike") node = <s key={key}>{node}</s>;
    else if (m.type === "link" && isSafeHref(m.attrs.href))
      node = (
        <SmartLink key={key} href={m.attrs.href}>
          {node}
        </SmartLink>
      );
  }
  return <span key={key}>{node}</span>;
}

const kids = (n: { content?: RichNode[] }) => (n.content ?? []).map((c, i) => renderNode(c, i));

function renderNode(n: RichNode, key: number): ReactNode {
  switch (n.type) {
    case "text":
      return n.marks?.length ? renderMarks(n.text, n.marks, key) : n.text;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "paragraph":
      return <p key={key}>{kids(n)}</p>;
    case "heading": {
      const H = `h${n.attrs.level}` as "h2" | "h3" | "h4";
      return (
        <H key={key} id={n.attrs.level < 4 ? slugify(plain(n.content)) || undefined : undefined}>
          {kids(n)}
        </H>
      );
    }
    case "bulletList":
      return <ul key={key}>{kids(n)}</ul>;
    case "orderedList":
      return <ol key={key}>{kids(n)}</ol>;
    case "listItem":
      return <li key={key}>{kids(n)}</li>;
    case "blockquote":
      return <blockquote key={key}>{kids(n)}</blockquote>;
  }
}
