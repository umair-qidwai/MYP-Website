import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ExternalLink, FilePlus2, FileText, Home, RotateCcw, Search, Trash2 } from "lucide-react";
import { slugify } from "@shared/slug";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Dialog, EmptyState, PageHeader, Spinner, StatusBadge, TextInput, cx, timeAgo, useToast } from "../ui";

export type PageSummary = {
  id: string;
  path: string;
  title: string;
  status: string;
  hasChanges: boolean;
  publishedAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export default function PagesList() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [trash, setTrash] = useState<PageSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "changes">("all");
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [showTrash, setShowTrash] = useState(false);

  const load = () =>
    api.get<{ pages: PageSummary[] }>("/api/admin/pages").then(
      (r) => setPages(r.pages),
      (e) => toast("error", e.message),
    );
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    let l = pages ?? [];
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((p) => p.title.toLowerCase().includes(s) || p.path.includes(s));
    if (filter === "published") l = l.filter((p) => p.status === "published");
    if (filter === "draft") l = l.filter((p) => p.status !== "published");
    if (filter === "changes") l = l.filter((p) => p.status === "published" && p.hasChanges);
    return l;
  }, [pages, q, filter]);

  const languageOf = (path: string) => path.match(/^(ar|es|fr|ht|so)\//)?.[1];

  return (
    <>
      <PageHeader
        title="Pages"
        description="Every page on the website. Open a page to change its words, pictures and buttons."
        actions={
          <>
            {user?.role === "admin" && (
              <Button
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  setShowTrash(true);
                  api.get<{ pages: PageSummary[] }>("/api/admin/pages/trash/list").then((r) => setTrash(r.pages));
                }}
              >
                Bin
              </Button>
            )}
            <Button variant="primary" icon={<FilePlus2 className="size-4" />} onClick={() => setCreating(true)}>
              New page
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search pages</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages"
              className="h-10 w-full rounded-lg border border-black/15 bg-white pl-9 pr-3 text-[0.93rem] outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
            />
          </label>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter pages">
            {(
              [
                ["all", "All"],
                ["published", "Live"],
                ["draft", "Drafts"],
                ["changes", "Unpublished edits"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={filter === k}
                type="button"
                onClick={() => setFilter(k)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-[0.85rem] font-semibold",
                  filter === k ? "bg-[#2d1b4e] text-white" : "text-ink-2 hover:bg-black/[0.05]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {!pages ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<FileText className="size-5" />} title="No pages match" description="Try a different search or filter." />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {list.map((p) => (
              <li key={p.id} className="group flex items-center gap-4 px-4 py-3 hover:bg-black/[0.015]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink-2">
                  {p.path === "" ? <Home className="size-4" /> : <FileText className="size-4" />}
                </span>
                <Link to={`/admin/pages/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold group-hover:text-plum">
                    {p.path === "" ? "Homepage" : p.title}
                    {languageOf(p.path) && (
                      <span className="ml-2 rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase text-ink-2">{languageOf(p.path)}</span>
                    )}
                  </p>
                  <p className="truncate text-[0.82rem] text-muted">/{p.path}</p>
                </Link>
                <div className="hidden w-48 shrink-0 sm:block">
                  <StatusBadge status={p.status} hasChanges={p.hasChanges} />
                </div>
                <p className="hidden w-40 shrink-0 text-right text-[0.8rem] text-muted md:block">
                  {timeAgo(p.updatedAt)}
                  {p.updatedBy ? ` · ${p.updatedBy.split(" ")[0]}` : ""}
                </p>
                {p.status === "published" && (
                  <a
                    href={`/${p.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
                    aria-label={`View ${p.title} on the website`}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewPageDialog
        open={creating}
        pages={pages ?? []}
        onClose={() => {
          setCreating(false);
          if (params.get("new")) setParams({});
        }}
        onCreated={(id) => navigate(`/admin/pages/${id}`)}
      />

      <Dialog open={showTrash} onClose={() => setShowTrash(false)} title="Bin — deleted pages" size="lg">
        {!trash ? (
          <Spinner />
        ) : trash.length === 0 ? (
          <EmptyState title="The bin is empty" />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {trash.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-[0.82rem] text-muted">/{p.path}</p>
                </div>
                <Button
                  size="sm"
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={async () => {
                    try {
                      await api.post(`/api/admin/pages/${p.id}/restore`);
                      toast("success", `“${p.title}” restored as a draft.`);
                      setTrash((t) => t?.filter((x) => x.id !== p.id) ?? null);
                      void load();
                    } catch (e) {
                      toast("error", (e as Error).message);
                    }
                  }}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}

function NewPageDialog({ open, onClose, onCreated, pages }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; pages: PageSummary[] }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const [touched, setTouched] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!touched) setPath(slugify(title));
  }, [title, touched]);
  useEffect(() => {
    if (open) {
      setTitle("");
      setPath("");
      setTouched(false);
      setCopyFrom("");
      setError("");
    }
  }, [open]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await api.post<{ id: string }>("/api/admin/pages", { title, path, copyFrom: copyFrom || undefined });
      toast("success", "Page created as a draft. Add some sections, then publish when it's ready.");
      onCreated(r.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a new page"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!title.trim() || !path} onClick={create}>
            Create page
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <TextInput label="Page title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Summer Programs" />
        <TextInput
          label="Web address"
          value={path}
          onChange={(e) => {
            setTouched(true);
            setPath(e.target.value.toLowerCase().replace(/[^a-z0-9/-]/g, "-"));
          }}
          help={
            <>
              The page will live at <strong>myprojectusa.org/{path || "…"}</strong>. Use lowercase words separated by dashes.
            </>
          }
          error={error}
        />
        <label className="grid gap-1.5 text-[0.85rem] font-semibold">
          Start from
          <select
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            className="h-10 rounded-lg border border-black/15 bg-white px-3 text-[0.93rem] font-normal"
          >
            <option value="">A blank page</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                A copy of “{p.path === "" ? "Homepage" : p.title}”
              </option>
            ))}
          </select>
        </label>
      </div>
    </Dialog>
  );
}
