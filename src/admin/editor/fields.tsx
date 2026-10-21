import { lazy, Suspense, useEffect, useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, FileText, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { ButtonRef, FileRef, ImageRef } from "@shared/blocks";
import { isSafeHref, type RichDoc } from "@shared/richtext";
import { api } from "../api";
import { fmtBytes, toFileRef, toImageRef } from "../media";
import { Button, Field, SelectInput, TextArea, TextInput, Toggle, cx } from "../ui";
import { MediaPicker, type PickerKind } from "./MediaPicker";

const RichTextEditor = lazy(() => import("./RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

// ── Field specification ─────────────────────────────────────────────────────
type Base = { key: string; label: string; help?: string; optional?: boolean };
export type FieldSpec =
  | (Base & { kind: "text"; placeholder?: string; max?: number })
  | (Base & { kind: "textarea"; rows?: number; max?: number })
  | (Base & { kind: "rich" })
  | (Base & { kind: "image" })
  | (Base & { kind: "file"; accept: PickerKind })
  | (Base & { kind: "link" })
  | (Base & { kind: "date" })
  | (Base & { kind: "number"; min?: number; max?: number })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  | (Base & { kind: "toggle" })
  | (Base & { kind: "buttons"; max?: number })
  | (Base & {
      kind: "list";
      itemLabel: string;
      fields: FieldSpec[];
      newItem: () => Record<string, unknown>;
      summary?: (item: Record<string, unknown>) => string;
      max?: number;
    })
  | (Base & { kind: "note"; text: ReactNode });

type Obj = Record<string, unknown>;

export function FieldsForm({ fields, value, onChange }: { fields: FieldSpec[]; value: Obj; onChange: (v: Obj) => void }) {
  const set = (k: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined || v === "") delete next[k];
    else next[k] = v;
    onChange(next);
  };
  return (
    <div className="grid gap-5">
      {fields.map((f) => (
        <FieldControl key={f.key} spec={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  );
}

function FieldControl({ spec, value, onChange }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  switch (spec.kind) {
    case "note":
      return <p className="rounded-lg bg-plum-soft/60 px-3 py-2.5 text-[0.84rem] leading-relaxed text-ink-2">{spec.text}</p>;
    case "text":
      return (
        <TextInput
          label={spec.label}
          help={spec.help}
          optional={spec.optional}
          placeholder={spec.placeholder}
          maxLength={spec.max}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <TextArea
          label={spec.label}
          help={spec.help}
          optional={spec.optional}
          rows={spec.rows ?? 4}
          maxLength={spec.max}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
      return (
        <TextInput
          type="date"
          label={spec.label}
          help={spec.help}
          optional={spec.optional}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[14rem]"
        />
      );
    case "number":
      return (
        <TextInput
          type="number"
          label={spec.label}
          help={spec.help}
          min={spec.min}
          max={spec.max}
          value={value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="max-w-[10rem]"
        />
      );
    case "select":
      return (
        <SelectInput
          label={spec.label}
          help={spec.help}
          optional={spec.optional}
          options={spec.options}
          value={String(value ?? spec.options[0]?.value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "toggle":
      return <Toggle label={spec.label} help={spec.help} checked={!!value} onChange={onChange} />;
    case "link":
      return <LinkInput label={spec.label} help={spec.help} optional={spec.optional} value={String(value ?? "")} onChange={(v) => onChange(v)} />;
    case "rich":
      return (
        <Field label={spec.label} help={spec.help} optional={spec.optional}>
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-black/[0.04]" />}>
            <RichTextEditor value={value as RichDoc | undefined} onChange={(d) => onChange(d)} label={spec.label} />
          </Suspense>
        </Field>
      );
    case "image":
      return <ImageField label={spec.label} help={spec.help} optional={spec.optional} value={value as ImageRef | undefined} onChange={onChange} />;
    case "file":
      return (
        <FileField label={spec.label} help={spec.help} optional={spec.optional} accept={spec.accept} value={value as FileRef | undefined} onChange={onChange} />
      );
    case "buttons":
      return <ButtonsField label={spec.label} help={spec.help} max={spec.max} value={(value as ButtonRef[] | undefined) ?? []} onChange={onChange} />;
    case "list":
      return <ListField spec={spec} value={(value as Obj[] | undefined) ?? []} onChange={onChange} />;
  }
}

// ── Links with page suggestions ─────────────────────────────────────────────
let pageCache: Promise<{ path: string; title: string }[]> | null = null;
function usePagePaths() {
  const [paths, setPaths] = useState<{ path: string; title: string }[]>([]);
  useEffect(() => {
    pageCache ??= api.get<{ pages: { path: string; title: string }[] }>("/api/admin/pages").then((r) => r.pages);
    pageCache.then(setPaths).catch(() => {});
  }, []);
  return paths;
}

export function LinkInput({
  label,
  value,
  onChange,
  help,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  optional?: boolean;
}) {
  const id = useId();
  const pages = usePagePaths();
  const invalid = value.trim() !== "" && !isSafeHref(value.trim());
  return (
    <Field
      label={label}
      optional={optional}
      htmlFor={id}
      error={invalid ? "Start with https:// for other websites, / for a page on this site, mailto: for email or tel: for phone." : undefined}
      help={help ?? "Pick a page from the list, or paste a full web address (https://…)."}
    >
      <input
        id={id}
        list={`${id}-pages`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v))
            onChange(`https://${v}`); // "example.org" → "https://example.org"
          else if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) onChange(`mailto:${v}`);
        }}
        placeholder="/volunteer or https://…"
        className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-[0.95rem] outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
        aria-invalid={invalid || undefined}
      />
      <datalist id={`${id}-pages`}>
        {pages.map((p) => (
          <option key={p.path} value={`/${p.path}`}>
            {p.title}
          </option>
        ))}
      </datalist>
    </Field>
  );
}

// ── Media fields ────────────────────────────────────────────────────────────
function ImageField({
  label,
  value,
  onChange,
  help,
  optional,
}: {
  label: string;
  value?: ImageRef;
  onChange: (v: ImageRef | undefined) => void;
  help?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} help={help} optional={optional}>
      {value ? (
        <div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 sm:flex-row">
          <img src={value.variants?.[0]?.src ?? value.src} alt="" className="h-28 w-full rounded-md bg-black/[0.04] object-contain sm:w-40" />
          <div className="grid flex-1 content-start gap-2">
            <TextInput
              label="Picture description (for screen readers)"
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="What does the picture show?"
              error={!value.alt ? "Please describe the picture (leave blank only if it's purely decorative)." : undefined}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setOpen(true)}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => onChange(undefined)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-24 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-white text-[0.9rem] font-semibold text-ink-2 hover:border-plum hover:text-plum"
        >
          <ImagePlus className="size-5" /> Choose an image
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} kind="image" onPick={(m) => onChange(toImageRef(m))} />
    </Field>
  );
}

function FileField({
  label,
  value,
  onChange,
  accept,
  help,
  optional,
}: {
  label: string;
  value?: FileRef;
  onChange: (v: FileRef | undefined) => void;
  accept: PickerKind;
  help?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} help={help} optional={optional}>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3">
          <span className="flex min-w-0 items-center gap-3">
            <FileText className="size-5 shrink-0 text-plum" />
            <span className="min-w-0">
              <a href={value.url} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:underline">
                {value.filename ?? value.url.split("/").pop()}
              </a>
              {value.size ? <span className="text-[0.8rem] text-muted">{fmtBytes(value.size)}</span> : null}
            </span>
          </span>
          <span className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => setOpen(true)}>
              Replace
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(undefined)} aria-label="Remove file">
              <X className="size-3.5" />
            </Button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-16 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-white text-[0.9rem] font-semibold text-ink-2 hover:border-plum hover:text-plum"
        >
          <FileText className="size-5" /> Choose or upload a file
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} kind={accept} onPick={(m) => onChange(toFileRef(m))} />
    </Field>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────
function ButtonsField({
  label,
  value,
  onChange,
  max = 6,
  help,
}: {
  label: string;
  value: ButtonRef[];
  onChange: (v: ButtonRef[]) => void;
  max?: number;
  help?: string;
}) {
  const update = (i: number, patch: Partial<ButtonRef>) => onChange(value.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <Field label={label} help={help}>
      <div className="grid gap-2">
        {value.map((b, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-black/10 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <TextInput label="Button text" value={b.label} onChange={(e) => update(i, { label: e.target.value })} />
              <SelectInput
                label="Style"
                value={b.style}
                onChange={(e) => update(i, { style: e.target.value as ButtonRef["style"] })}
                options={[
                  { value: "primary", label: "Solid" },
                  { value: "secondary", label: "Outline" },
                  { value: "link", label: "Text link" },
                ]}
              />
            </div>
            <LinkInput label="Goes to" value={b.href} onChange={(href) => update(i, { href })} />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move button up">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move button down">
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-[#b42318]"
                icon={<Trash2 className="size-3.5" />}
                onClick={() => onChange(value.filter((_, k) => k !== i))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <Button
            size="sm"
            icon={<Plus className="size-3.5" />}
            onClick={() => onChange([...value, { label: "", href: "", style: value.length ? "secondary" : "primary" }])}
            className="justify-self-start"
          >
            Add button
          </Button>
        )}
      </div>
    </Field>
  );
}

// ── Repeatable lists ────────────────────────────────────────────────────────
function ListField({ spec, value, onChange }: { spec: Extract<FieldSpec, { kind: "list" }>; value: Obj[]; onChange: (v: Obj[]) => void }) {
  const [open, setOpen] = useState<number | null>(value.length === 0 ? null : -1);
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    setOpen(i + d);
  };
  return (
    <Field label={spec.label} help={spec.help}>
      <ol className="grid gap-2">
        {value.map((item, i) => {
          const summary = spec.summary?.(item) || `${spec.itemLabel} ${i + 1}`;
          const isOpen = open === i;
          return (
            <li key={i} className="rounded-lg border border-black/10 bg-white">
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-[0.9rem] font-medium"
                >
                  <ChevronDown className={cx("size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                  <span className="truncate">{summary}</span>
                </button>
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${summary} up`}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${summary} down`}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#b42318]"
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  aria-label={`Remove ${summary}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-black/[0.07] p-3">
                  <FieldsForm fields={spec.fields} value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {(!spec.max || value.length < spec.max) && (
        <Button
          size="sm"
          icon={<Plus className="size-3.5" />}
          className="mt-2 justify-self-start"
          onClick={() => {
            onChange([...value, spec.newItem()]);
            setOpen(value.length);
          }}
        >
          Add {spec.itemLabel.toLowerCase()}
        </Button>
      )}
    </Field>
  );
}
