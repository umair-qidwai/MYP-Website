import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Film, Loader2, Search, UploadCloud } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { api } from "../api";
import { ACCEPT, uploadFile } from "../media";
import { Button, Dialog, EmptyState, Spinner, cx, useToast } from "../ui";

export type PickerKind = "image" | "document" | "video" | "any";

export function useMediaList(kind: PickerKind, q: string) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const load = useCallback(
    async (p = 0) => {
      const type = kind === "image" ? "image" : kind === "any" ? "" : "document";
      const r = await api.get<{ items: MediaItem[]; hasMore: boolean }>(`/api/admin/media?q=${encodeURIComponent(q)}&type=${type}&page=${p}`);
      const filtered =
        kind === "video"
          ? r.items.filter((m) => m.mime.startsWith("video/"))
          : kind === "document"
            ? r.items.filter((m) => m.mime === "application/pdf")
            : r.items;
      setItems((prev) => (p === 0 ? filtered : [...(prev ?? []), ...filtered]));
      setHasMore(r.hasMore);
      setPage(p);
    },
    [kind, q],
  );
  useEffect(() => {
    const t = setTimeout(() => void load(0), 200);
    return () => clearTimeout(t);
  }, [load]);
  return { items, hasMore, more: () => load(page + 1), reload: () => load(0), setItems };
}

/** Drag-and-drop upload zone with per-file progress. */
export function UploadZone({ onUploaded, accept = ACCEPT, compact }: { onUploaded: (items: MediaItem[]) => void; accept?: string; compact?: boolean }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [jobs, setJobs] = useState<{ name: string; progress: number; error?: string }[]>([]);

  async function handle(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    setJobs(list.map((f) => ({ name: f.name, progress: 0 })));
    const done: MediaItem[] = [];
    for (let i = 0; i < list.length; i++) {
      try {
        const item = await uploadFile(list[i], "", (p) => setJobs((j) => j.map((x, k) => (k === i ? { ...x, progress: p } : x))));
        done.push(item);
        setJobs((j) => j.map((x, k) => (k === i ? { ...x, progress: 1 } : x)));
      } catch (e) {
        setJobs((j) => j.map((x, k) => (k === i ? { ...x, error: (e as Error).message } : x)));
        toast("error", (e as Error).message);
      }
    }
    if (done.length) {
      toast("success", `${done.length} file${done.length === 1 ? "" : "s"} uploaded. Remember to add a description to each picture.`);
      onUploaded(done);
    }
    setTimeout(() => setJobs((j) => j.filter((x) => x.error)), 1500);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        className={cx(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-10",
          over ? "border-plum bg-plum-soft/60" : "border-black/15 bg-white",
        )}
      >
        <UploadCloud className="size-7 text-plum" aria-hidden />
        <p className="text-[0.93rem] font-semibold">Drag files here, or</p>
        <Button variant="primary" size="sm" onClick={() => input.current?.click()}>
          Choose files
        </Button>
        <p className="text-[0.78rem] text-muted">Photos (JPG, PNG, WebP, GIF) · PDF documents · MP4 videos</p>
        <input ref={input} type="file" multiple accept={accept} className="sr-only" onChange={(e) => e.target.files && void handle(e.target.files)} />
      </div>
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-lg bg-white px-3 py-2 text-[0.85rem] ring-1 ring-black/[0.07]">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{j.name}</span>
                <span className={j.error ? "text-[#b42318]" : "text-muted"}>
                  {j.error ? "Failed" : j.progress >= 1 ? "Done" : `${Math.round(j.progress * 100)}%`}
                </span>
              </div>
              {!j.error && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
                  <div className="h-full rounded-full bg-plum transition-[width]" style={{ width: `${Math.round(j.progress * 100)}%` }} />
                </div>
              )}
              {j.error && <p className="mt-1 text-[0.78rem] text-[#b42318]">{j.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MediaThumb({ m, className }: { m: MediaItem; className?: string }) {
  if (m.mime.startsWith("image/"))
    return <img src={m.variants[0]?.url ?? m.url} alt={m.alt} loading="lazy" className={cx("h-full w-full object-cover", className)} />;
  const Icon = m.mime.startsWith("video/") ? Film : FileText;
  return (
    <div className={cx("grid h-full w-full place-items-center bg-[#f1eef8] p-2 text-center", className)}>
      <div>
        <Icon className="mx-auto size-7 text-plum" aria-hidden />
        <p className="mt-1 line-clamp-2 break-all text-[0.68rem] font-medium text-ink-2">{m.filename}</p>
      </div>
    </div>
  );
}

/** Choose a file from the library (or upload a new one). */
export function MediaPicker({
  open,
  onClose,
  onPick,
  kind = "image",
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: MediaItem) => void;
  kind?: PickerKind;
  title?: string;
}) {
  const [q, setQ] = useState("");
  const { items, hasMore, more, setItems } = useMediaList(kind, q);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const accept =
    kind === "image"
      ? "image/jpeg,image/png,image/webp,image/gif,image/avif"
      : kind === "document"
        ? "application/pdf"
        : kind === "video"
          ? "video/mp4"
          : ACCEPT;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={title ?? (kind === "image" ? "Choose an image" : kind === "video" ? "Choose a video" : "Choose a file")}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => {
              if (selected) onPick(selected);
              onClose();
            }}
          >
            Use selected
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <div>
          <UploadZone
            compact
            accept={accept}
            onUploaded={(up) => {
              setItems((prev) => [...up, ...(prev ?? [])]);
              setSelected(up[0]);
            }}
          />
        </div>
        <div>
          <label className="relative mb-3 block">
            <span className="sr-only">Search the library</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or description"
              className="h-10 w-full rounded-lg border border-black/15 pl-9 pr-3 outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
            />
          </label>
          {!items ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState title="Nothing found" description="Upload a file, or try another search." />
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m)}
                    onDoubleClick={() => {
                      onPick(m);
                      onClose();
                    }}
                    aria-pressed={selected?.id === m.id}
                    aria-label={`${m.filename}${m.alt ? ` — ${m.alt}` : ""}`}
                    className={cx(
                      "relative block aspect-square w-full overflow-hidden rounded-lg bg-black/[0.04] ring-2 transition",
                      selected?.id === m.id ? "ring-plum" : "ring-transparent hover:ring-black/20",
                    )}
                  >
                    <MediaThumb m={m} />
                    {selected?.id === m.id && (
                      <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-plum text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button size="sm" onClick={() => void more()} icon={<Loader2 className="hidden" />}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
