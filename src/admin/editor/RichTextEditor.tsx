import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Underline, Undo2, Unlink } from "lucide-react";
import { isSafeHref, type RichDoc } from "@shared/richtext";
import { Button, Dialog, cx } from "../ui";
import { LinkInput } from "./fields";

const EMPTY: RichDoc = { type: "doc", content: [] };

/**
 * Word-processor style editor. Only the formatting the website supports is available, so content
 * always matches the site's design and can't include unsafe markup.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 160,
  label,
}: {
  value?: RichDoc;
  onChange: (d: RichDoc) => void;
  placeholder?: string;
  minHeight?: number;
  label?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => isSafeHref(url) },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value && value.content.length ? value : EMPTY,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: "prose-myp !max-w-none min-h-[inherit] px-4 py-3 outline-none",
        "aria-label": label ?? "Text editor",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
  });

  // Keep in sync when the value is replaced from outside (e.g. restoring an earlier version)
  useEffect(() => {
    // The editor can be momentarily torn down (React StrictMode remounts); skip until it's live again
    if (!editor || editor.isDestroyed || !editor.view?.dom?.isConnected || editor.isFocused) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value && value.content.length ? value : EMPTY);
    if (current !== next) editor.commands.setContent(value && value.content.length ? value : EMPTY, { emitUpdate: false });
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
      href: (e?.getAttributes("link").href as string | undefined) ?? "",
    }),
  });

  if (!editor) return null;
  const T = ({ on, label: l, icon: Icon, run }: { on?: boolean; label: string; icon: typeof Bold; run: () => void }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      aria-pressed={on}
      aria-label={l}
      title={l}
      className={cx("grid size-8 place-items-center rounded-md transition-colors", on ? "bg-[#2d1b4e] text-white" : "text-ink-2 hover:bg-black/[0.06]")}
    >
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className="rounded-lg border border-black/15 bg-white focus-within:border-plum focus-within:ring-[3px] focus-within:ring-plum/15">
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-black/[0.08] bg-[#faf9f7] p-1"
        role="toolbar"
        aria-label="Formatting"
      >
        <T label="Large heading" icon={Heading2} on={state?.h2} run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <T label="Small heading" icon={Heading3} on={state?.h3} run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <span className="mx-1 h-5 w-px bg-black/10" />
        <T label="Bold" icon={Bold} on={state?.bold} run={() => editor.chain().focus().toggleBold().run()} />
        <T label="Italic" icon={Italic} on={state?.italic} run={() => editor.chain().focus().toggleItalic().run()} />
        <T label="Underline" icon={Underline} on={state?.underline} run={() => editor.chain().focus().toggleUnderline().run()} />
        <span className="mx-1 h-5 w-px bg-black/10" />
        <T label="Bulleted list" icon={List} on={state?.bullet} run={() => editor.chain().focus().toggleBulletList().run()} />
        <T label="Numbered list" icon={ListOrdered} on={state?.ordered} run={() => editor.chain().focus().toggleOrderedList().run()} />
        <T label="Quote" icon={Quote} on={state?.quote} run={() => editor.chain().focus().toggleBlockquote().run()} />
        <T label="Divider line" icon={Minus} run={() => editor.chain().focus().setHorizontalRule().run()} />
        <span className="mx-1 h-5 w-px bg-black/10" />
        <T label={state?.link ? "Edit link" : "Add link"} icon={Link2} on={state?.link} run={() => setLinkOpen(true)} />
        {state?.link && <T label="Remove link" icon={Unlink} run={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} />}
        <span className="ml-auto flex">
          <T label="Undo" icon={Undo2} run={() => editor.chain().focus().undo().run()} />
          <T label="Redo" icon={Redo2} run={() => editor.chain().focus().redo().run()} />
        </span>
      </div>
      <div
        style={{ minHeight }}
        className="[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-black/35 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      >
        <EditorContent editor={editor} className="min-h-[inherit] [&>div]:min-h-[inherit]" />
      </div>
      <LinkDialog
        open={linkOpen}
        initial={state?.href ?? ""}
        onClose={() => setLinkOpen(false)}
        onSave={(href) => {
          if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
          else if (editor.state.selection.empty && !state?.link)
            editor
              .chain()
              .focus()
              .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
              .run();
          else
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href, target: /^https?:/.test(href) ? "_blank" : null })
              .run();
          setLinkOpen(false);
        }}
      />
    </div>
  );
}

function LinkDialog({ open, initial, onClose, onSave }: { open: boolean; initial: string; onClose: () => void; onSave: (href: string) => void }) {
  const [href, setHref] = useState(initial);
  useEffect(() => setHref(initial), [initial, open]);
  const valid = !href || isSafeHref(href);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Link"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave(href.trim())}>
            Save link
          </Button>
        </>
      }
    >
      <LinkInput label="Where should this link go?" value={href} onChange={setHref} />
    </Dialog>
  );
}
