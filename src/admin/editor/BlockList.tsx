import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { newBlockId, type Block } from "@shared/blocks";
import { Button, Dialog, cx, useConfirm } from "../ui";
import { FieldsForm } from "./fields";
import { BLOCK_SPECS, fromEditable, specFor, toEditable } from "./blockSpecs";

export type BlockErrors = Record<number, string>;

export function BlockList({
  blocks,
  onChange,
  errors = {},
  focus,
  onFocus,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  errors?: BlockErrors;
  focus?: string | null;
  onFocus?: (id: string | null) => void;
}) {
  const [addAt, setAddAt] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const { ask, element } = useConfirm();
  const open = focus ?? null;
  const setOpen = (id: string | null) => onFocus?.(id);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to, 0, b);
    onChange(next);
  };

  return (
    <div>
      <ol className="grid grid-cols-1 gap-2">
        {blocks.map((b, i) => {
          const spec = specFor(b.type);
          const Icon = spec?.icon;
          const isOpen = open === b.id;
          const summary = spec?.summary(b) || "Empty — click to edit";
          return (
            <li
              key={b.id}
              onDragOver={(e) => {
                if (drag === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) move(drag, i);
                setDrag(null);
                setOver(null);
              }}
              className={cx(
                "min-w-0 rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 transition",
                errors[i] ? "ring-[#e05a4f]" : isOpen ? "ring-plum/50" : "ring-black/[0.08]",
                b.hidden && "opacity-60",
                over === i && drag !== null && drag !== i && "ring-2 ring-plum",
              )}
            >
              <div className="flex items-center gap-1 py-1.5 pl-1.5 pr-2">
                <span
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragEnd={() => {
                    setDrag(null);
                    setOver(null);
                  }}
                  className="hidden cursor-grab touch-none p-1.5 text-black/30 hover:text-black/60 sm:block"
                  aria-hidden
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : b.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-black/[0.02]"
                >
                  {Icon && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-plum-soft text-plum">
                      <Icon className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block text-[0.9rem] font-semibold">
                      {spec?.label ?? b.type}
                      {b.hidden && <span className="ml-2 text-[0.75rem] font-medium text-muted">(hidden)</span>}
                    </span>
                    <span className="block truncate text-[0.8rem] text-muted">{summary}</span>
                  </span>
                  <ChevronDown className={cx("ml-auto size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden />
                </button>
                <div className="flex shrink-0 items-center">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} icon={ArrowUp} />
                  <IconBtn label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)} icon={ArrowDown} />
                  <IconBtn
                    label={b.hidden ? "Show on the website" : "Hide from the website"}
                    onClick={() => onChange(blocks.map((x, k) => (k === i ? ({ ...x, hidden: !x.hidden } as Block) : x)))}
                    icon={b.hidden ? EyeOff : Eye}
                  />
                  <IconBtn
                    label="Duplicate"
                    onClick={() => {
                      const copy = { ...structuredClone(b), id: newBlockId() } as Block;
                      onChange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
                    }}
                    icon={Copy}
                  />
                  <IconBtn
                    label="Delete section"
                    danger
                    onClick={async () => {
                      if (
                        await ask({
                          title: "Delete this section?",
                          body: `“${spec?.label}” will be removed from the page. You can undo this by restoring an earlier version.`,
                          confirm: "Delete section",
                          danger: true,
                        })
                      )
                        onChange(blocks.filter((_, k) => k !== i));
                    }}
                    icon={Trash2}
                  />
                </div>
              </div>
              {errors[i] && <p className="px-4 pb-2 text-[0.82rem] font-medium text-[#b42318]">{errors[i]}</p>}
              {isOpen && spec && (
                <div className="border-t border-black/[0.06] p-4 sm:p-5">
                  <FieldsForm
                    fields={spec.fields}
                    value={toEditable(b)}
                    onChange={(v) => onChange(blocks.map((x, k) => (k === i ? fromEditable({ ...v, id: b.id, type: b.type, hidden: b.hidden }) : x)))}
                  />
                </div>
              )}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setAddAt(i + 1)}
                  className="-mb-3 -mt-1 grid size-6 place-items-center rounded-full bg-white text-muted opacity-0 shadow ring-1 ring-black/10 transition hover:text-plum focus:opacity-100 [li:hover_&]:opacity-100"
                  aria-label="Add a section here"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => setAddAt(blocks.length)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-4 text-[0.92rem] font-semibold text-ink-2 hover:border-plum hover:text-plum"
      >
        <Plus className="size-4" /> Add a section
      </button>
      <AddBlockDialog
        open={addAt !== null}
        onClose={() => setAddAt(null)}
        onAdd={(b) => {
          const at = addAt ?? blocks.length;
          onChange([...blocks.slice(0, at), b, ...blocks.slice(at)]);
          setAddAt(null);
          setOpen(b.id);
        }}
      />
      {element}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  icon: Icon,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Eye;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        "grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-25",
        danger ? "text-[#b42318] hover:bg-[#fde7e5]" : "text-ink-2 hover:bg-black/[0.06]",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function AddBlockDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (b: Block) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a section" size="lg">
      <ul className="grid gap-2 sm:grid-cols-2">
        {BLOCK_SPECS.map((s) => (
          <li key={s.type}>
            <button
              type="button"
              onClick={() => onAdd(s.create())}
              className="flex h-full w-full items-start gap-3 rounded-xl p-3 text-left ring-1 ring-black/[0.08] transition hover:bg-plum-soft/40 hover:ring-plum/40"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-plum-soft text-plum">
                <s.icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[0.92rem] font-semibold">{s.label}</span>
                <span className="block text-[0.8rem] leading-snug text-muted">{s.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Dialog>
  );
}
