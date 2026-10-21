import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Copy, ExternalLink, Search, Trash2 } from "lucide-react";
import type { MediaItem } from "@shared/types";
import { api } from "../api";
import { fmtBytes } from "../media";
import { MediaThumb, UploadZone, useMediaList } from "../editor/MediaPicker";
import { Button, Card, Dialog, EmptyState, PageHeader, Spinner, TextArea, TextInput, cx, timeAgo, useToast } from "../ui";

type Usage = {
  pages: { id: string; title: string; path: string }[];
  entries: { id: string; title: string; collection: string }[];
  settings: string[];
  total: number;
};

export default function MediaLibrary() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"any" | "image" | "document">("any");
  const { items, hasMore, more, setItems } = useMediaList(kind, q);
  const [open, setOpen] = useState<MediaItem | null>(null);

  return (
    <>
      <PageHeader title="Images & files" description="Everything uploaded to the website. Pictures you upload here can be used on any page." />
      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <UploadZone onUploaded={(up) => setItems((prev) => [...up, ...(prev ?? [])])} />
          <div className="rounded-xl bg-white p-4 text-[0.85rem] leading-relaxed text-ink-2 ring-1 ring-black/[0.07]">
            <p className="font-semibold text-ink">Tips</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Photos are automatically resized and hidden location data is removed.</li>
              <li>Add a short description to every picture — it's read aloud to people who use screen readers.</li>
              <li>Files that are still used on the website can't be deleted.</li>
            </ul>
          </div>
        </div>
        <Card>
          <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search files</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or description"
                className="h-10 w-full rounded-lg border border-black/15 pl-9 pr-3 outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
              />
            </label>
            <div className="flex gap-1" role="tablist" aria-label="File type">
              {(
                [
                  ["any", "All"],
                  ["image", "Images"],
                  ["document", "Documents & video"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-[0.85rem] font-semibold",
                    kind === k ? "bg-[#2d1b4e] text-white" : "text-ink-2 hover:bg-black/[0.05]",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {!items ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState title="No files found" description="Upload something, or try a different search." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6">
              {items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setOpen(m)} className="group block w-full text-left">
                    <span className="relative block aspect-square overflow-hidden rounded-lg bg-black/[0.04] ring-1 ring-black/[0.06] transition group-hover:ring-plum">
                      <MediaThumb m={m} />
                      {m.mime.startsWith("image/") && !m.alt && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-[#fdf1d9] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#8a5300]">
                          Needs description
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block truncate text-[0.8rem] font-medium">{m.filename}</span>
                    <span className="block text-[0.72rem] text-muted">
                      {fmtBytes(m.size)}
                      {m.width ? ` · ${m.width}×${m.height}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <div className="border-t border-black/[0.06] p-4 text-center">
              <Button onClick={() => void more()}>Load more</Button>
            </div>
          )}
        </Card>
      </div>
      {open && (
        <MediaDetails
          item={open}
          onClose={() => setOpen(null)}
          onSaved={(m) => setItems((prev) => prev?.map((x) => (x.id === m.id ? m : x)) ?? null)}
          onDeleted={(id) => {
            setItems((prev) => prev?.filter((x) => x.id !== id) ?? null);
            setOpen(null);
            toast("success", "File deleted.");
          }}
        />
      )}
    </>
  );
}

function MediaDetails({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: MediaItem;
  onClose: () => void;
  onSaved: (m: MediaItem) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [alt, setAlt] = useState(item.alt);
  const [filename, setFilename] = useState(item.filename);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const absolute = new URL(item.url, location.origin).toString();

  async function save() {
    setBusy(true);
    try {
      await api.put(`/api/admin/media/${item.id}`, { alt, filename });
      onSaved({ ...item, alt, filename });
      toast("success", "Saved.");
      onClose();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkDelete() {
    const u = await api.get<Usage>(`/api/admin/media/${item.id}/usage`);
    setUsage(u);
    setConfirmDelete(true);
  }
  async function doDelete() {
    try {
      await api.del(`/api/admin/media/${item.id}`);
      onDeleted(item.id);
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="File details"
      size="lg"
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-[#b42318]" icon={<Trash2 className="size-4" />} onClick={() => void checkDelete()}>
            Delete…
          </Button>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-black/[0.06]">
          {item.mime.startsWith("image/") ? (
            <img src={item.url} alt={item.alt} className="max-h-[50vh] w-full object-contain" />
          ) : item.mime.startsWith("video/") ? (
            <video src={item.url} controls className="w-full" />
          ) : (
            <div className="aspect-[4/3]">
              <MediaThumb m={item} />
            </div>
          )}
        </div>
        <div className="grid content-start gap-4">
          {item.mime.startsWith("image/") && (
            <TextArea
              label="Description (alt text)"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              rows={3}
              help="Describe what the picture shows, in one sentence. Example: “Volunteers packing food boxes at MY Family Pantry.”"
            />
          )}
          <TextInput label="File name" value={filename} onChange={(e) => setFilename(e.target.value)} />
          <div className="rounded-lg bg-black/[0.03] p-3 text-[0.82rem] text-ink-2">
            <p>
              {item.mime} · {fmtBytes(item.size)}
              {item.width ? ` · ${item.width}×${item.height}px` : ""}
            </p>
            <p>Uploaded {timeAgo(item.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              icon={<Copy className="size-3.5" />}
              onClick={() => {
                void navigator.clipboard.writeText(absolute);
                toast("success", "Link copied.");
              }}
            >
              Copy link
            </Button>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[0.82rem] font-semibold ring-1 ring-black/12 hover:bg-black/[0.03]"
            >
              <ExternalLink className="size-3.5" /> Open
            </a>
          </div>
        </div>
      </div>
      {confirmDelete && usage && (
        <div className={cx("mt-5 rounded-xl p-4 text-[0.9rem]", usage.total ? "bg-[#fdf1d9]" : "bg-[#fde7e5]")}>
          {usage.total ? (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" /> This file is still used on the website, so it can't be deleted.
              </p>
              <ul className="mt-2 list-disc pl-5">
                {usage.pages.map((p) => (
                  <li key={p.id}>
                    Page:{" "}
                    <Link className="underline" to={`/admin/pages/${p.id}`}>
                      {p.title}
                    </Link>
                  </li>
                ))}
                {usage.entries.map((e) => (
                  <li key={e.id}>
                    {e.collection}:{" "}
                    <Link className="underline" to={`/admin/collections/${e.collection}/${e.id}`}>
                      {e.title}
                    </Link>
                  </li>
                ))}
                {usage.settings.map((s) => (
                  <li key={s}>Site settings ({s})</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>Delete this file permanently? This can't be undone.</p>
              <Button variant="danger" size="sm" onClick={() => void doDelete()}>
                Delete permanently
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
