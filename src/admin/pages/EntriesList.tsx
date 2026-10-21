import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, CalendarDays, Plus, Search } from "lucide-react";
import { getCollection } from "@shared/collections";
import { api } from "../api";
import { Button, Card, Dialog, EmptyState, PageHeader, Spinner, StatusBadge, TextInput, cx, timeAgo, useToast } from "../ui";

export type EntrySummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  sortOrder: number;
  date: string | null;
  hasChanges: boolean;
  updatedAt: string;
  updatedBy: string | null;
  thumb: string | null;
};

export default function EntriesList() {
  const { collection = "" } = useParams();
  const def = getCollection(collection);
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [entries, setEntries] = useState<EntrySummary[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft" | "archived">("");
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setEntries(null);
    const t = setTimeout(() => {
      api.get<{ entries: EntrySummary[] }>(`/api/admin/entries?collection=${collection}&q=${encodeURIComponent(q)}&status=${status}`).then(
        (r) => setEntries(r.entries),
        (e) => toast("error", e.message),
      );
    }, 180);
    return () => clearTimeout(t);
  }, [collection, q, status, toast]);
  useEffect(() => setCreating(params.get("new") === "1"), [params]);

  const manual = def?.sortBy === "manual";
  const list = useMemo(() => entries ?? [], [entries]);

  if (!def) return <p>Unknown collection.</p>;

  async function move(i: number, d: -1 | 1) {
    if (!entries) return;
    const next = [...entries];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setEntries(next);
    try {
      await api.post("/api/admin/entries/reorder", { collection, ids: next.map((e) => e.id) });
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description + (def.publicPath ? ` Each item gets its own page at myprojectusa.org/${def.publicPath}/…` : "")}
        actions={
          <>
            {manual && !q && !status && (
              <Button onClick={() => setReordering(!reordering)} aria-pressed={reordering}>
                {reordering ? "Done ordering" : "Change order"}
              </Button>
            )}
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Add {def.singular.toLowerCase()}
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${def.label.toLowerCase()}`}
              className="h-10 w-full rounded-lg border border-black/15 pl-9 pr-3 outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
            />
          </label>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
            {(
              [
                ["", "All"],
                ["published", "Live"],
                ["draft", "Drafts"],
                ["archived", "Archived"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k || "all"}
                type="button"
                role="tab"
                aria-selected={status === k}
                onClick={() => setStatus(k)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-[0.85rem] font-semibold",
                  status === k ? "bg-[#2d1b4e] text-white" : "text-ink-2 hover:bg-black/[0.05]",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {!entries ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title={`No ${def.label.toLowerCase()} yet`}
            description="Add the first one — it will appear on the website once you publish it."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                Add {def.singular.toLowerCase()}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {list.map((e, i) => (
              <li key={e.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-black/[0.015]">
                <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-black/[0.05]">
                  {e.thumb && <img src={e.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </span>
                <Link to={`/admin/collections/${collection}/${e.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold hover:text-plum">{e.title}</p>
                  <p className="truncate text-[0.8rem] text-muted">
                    {e.date
                      ? new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { dateStyle: "medium" })
                      : def.publicPath
                        ? `/${def.publicPath}/${e.slug}`
                        : ""}
                  </p>
                </Link>
                <div className="hidden w-48 shrink-0 sm:block">
                  <StatusBadge status={e.status} hasChanges={e.hasChanges} />
                </div>
                <p className="hidden w-28 shrink-0 text-right text-[0.8rem] text-muted md:block">{timeAgo(e.updatedAt)}</p>
                {reordering && (
                  <span className="flex shrink-0">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => void move(i, -1)} aria-label={`Move ${e.title} up`}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={i === list.length - 1} onClick={() => void move(i, 1)} aria-label={`Move ${e.title} down`}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <NewEntryDialog
        open={creating}
        label={def.singular}
        onClose={() => {
          setCreating(false);
          if (params.get("new")) setParams({});
        }}
        onCreate={async (title) => {
          const r = await api.post<{ id: string }>("/api/admin/entries", { collection, title });
          navigate(`/admin/collections/${collection}/${r.id}`);
        }}
      />
    </>
  );
}

function NewEntryDialog({ open, label, onClose, onCreate }: { open: boolean; label: string; onClose: () => void; onCreate: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setTitle("");
      setError("");
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`New ${label.toLowerCase()}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!title.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate(title);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={error} help="You'll add the details on the next screen." />
    </Dialog>
  );
}
