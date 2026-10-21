import { useCallback, useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { Archive, ArrowLeft, ExternalLink, History, Save, Send, Trash2, Undo2 } from "lucide-react";
import { getCollection, type CollectionDef, type EntryDoc, type FieldDef } from "@shared/collections";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Dialog, PageHeader, Spinner, StatusBadge, TextArea, TextInput, timeAgo, useConfirm, useToast } from "../ui";
import { FieldsForm, type FieldSpec } from "../editor/fields";

type EntryData = { id: string; slug: string; title: string; status: string; hasChanges: boolean; updatedAt: string; doc: EntryDoc };
type Revision = { id: number; action: string; createdAt: string; userName: string | null };

function toSpec(f: FieldDef): FieldSpec {
  const base = { key: f.name, label: f.label, help: f.help, optional: !f.required };
  switch (f.type) {
    case "text":
      return { ...base, kind: "text", max: f.max };
    case "textarea":
      return { ...base, kind: "textarea", max: f.max };
    case "richtext":
      return { ...base, kind: "rich" };
    case "date":
      return { ...base, kind: "date" };
    case "image":
      return { ...base, kind: "image" };
    case "file":
      return { ...base, kind: "file", accept: "document" };
    case "link":
      return { ...base, kind: "link" };
    case "select":
      return { ...base, kind: "select", options: [{ value: "", label: "—" }, ...f.options.map((o) => ({ value: o, label: o }))] };
  }
}

export default function EntryEditor() {
  const { collection = "", id } = useParams();
  const def = getCollection(collection) as CollectionDef;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { ask, element } = useConfirm();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [doc, setDoc] = useState<EntryDoc | null>(null);
  const [slug, setSlug] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [history, setHistory] = useState<Revision[] | null>(null);

  const load = useCallback(async () => {
    const r = await api.get<{ entry: EntryData }>(`/api/admin/entries/${id}`);
    setEntry(r.entry);
    setDoc(r.entry.doc);
    setSlug(r.entry.slug);
    setSaved(JSON.stringify({ doc: r.entry.doc, slug: r.entry.slug }));
  }, [id]);
  useEffect(() => {
    load().catch((e) => toast("error", e.message));
  }, [load, toast]);

  const dirty = !!doc && JSON.stringify({ doc, slug }) !== saved;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save(): Promise<boolean> {
    if (!doc || !entry) return false;
    setBusy("save");
    setFieldError("");
    try {
      const r = await api.put<{ slug: string }>(`/api/admin/entries/${entry.id}`, { doc, slug });
      setSlug(r.slug);
      setSaved(JSON.stringify({ doc, slug: r.slug }));
      setEntry({ ...entry, title: doc.title, slug: r.slug, hasChanges: true, updatedAt: new Date().toISOString() });
      toast("success", "Saved.");
      return true;
    } catch (e) {
      setFieldError((e as ApiError).message);
      toast("error", (e as ApiError).message);
      return false;
    } finally {
      setBusy("");
    }
  }
  const act = async (action: "publish" | "unpublish" | "archive" | "discard", msg: string) => {
    if (!entry) return;
    if (action === "publish" && dirty && !(await save())) return;
    setBusy(action);
    try {
      await api.post(`/api/admin/entries/${entry.id}/${action}`);
      toast("success", msg);
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  };

  if (!def) return <p>Unknown collection.</p>;
  if (!entry || !doc) return <Spinner />;
  const canPublish = !!user?.canPublish;
  const publicUrl = def.publicPath ? `/${def.publicPath}/${entry.slug}` : null;

  return (
    <>
      <PageHeader
        back={
          <Link
            to={`/admin/collections/${collection}`}
            className="mb-2 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" /> {def.label}
          </Link>
        }
        title={doc.title || "Untitled"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} hasChanges={entry.hasChanges || dirty} />
            {dirty ? <Badge tone="amber">Unsaved changes</Badge> : <span>Saved {timeAgo(entry.updatedAt)}</span>}
            {publicUrl && entry.status === "published" && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-plum hover:underline">
                View live <ExternalLink className="size-3.5" />
              </a>
            )}
          </span>
        }
        actions={
          <>
            <Button
              icon={<History className="size-4" />}
              onClick={() => api.get<{ revisions: Revision[] }>(`/api/admin/entries/${entry.id}/revisions`).then((r) => setHistory(r.revisions))}
            >
              History
            </Button>
            {publicUrl && (
              <Button
                icon={<ExternalLink className="size-4" />}
                onClick={async () => {
                  if (dirty && !(await save())) return;
                  window.open(`/preview${publicUrl}`, "_blank", "noopener");
                }}
              >
                Preview
              </Button>
            )}
            <Button icon={<Save className="size-4" />} loading={busy === "save"} disabled={!dirty} onClick={() => void save()}>
              Save draft
            </Button>
            {canPublish && (
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                loading={busy === "publish"}
                disabled={entry.status === "published" && !entry.hasChanges && !dirty}
                onClick={() => void act("publish", "Published — it's now on the website.")}
              >
                {entry.status === "published" ? "Publish changes" : "Publish"}
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <div className="grid gap-5 p-5 sm:p-6">
            <TextInput
              label="Title"
              value={doc.title}
              onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              error={fieldError && !doc.title ? fieldError : undefined}
            />
            <FieldsForm fields={def.fields.map(toSpec)} value={doc.data} onChange={(data) => setDoc({ ...doc, data })} />
            {fieldError && <p className="rounded-lg bg-[#fde7e5] p-3 text-[0.88rem] text-[#7a1a12]">{fieldError}</p>}
          </div>
        </Card>
        <div className="grid content-start gap-4">
          <Card title="Web address & search">
            <div className="grid gap-4 p-4">
              {def.publicPath && (
                <TextInput
                  label="Address"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  help={`myprojectusa.org/${def.publicPath}/${slug}`}
                />
              )}
              <TextArea
                label="Search result description"
                optional
                rows={3}
                value={doc.seo?.description ?? ""}
                onChange={(e) => setDoc({ ...doc, seo: { description: e.target.value || undefined } })}
              />
            </div>
          </Card>
          {canPublish && (
            <Card title="More actions">
              <div className="grid gap-2 p-4">
                {entry.status === "published" && entry.hasChanges && (
                  <Button icon={<Undo2 className="size-4" />} onClick={() => void act("discard", "Draft changes discarded.")}>
                    Discard draft changes
                  </Button>
                )}
                {entry.status === "published" && (
                  <Button icon={<Undo2 className="size-4" />} loading={busy === "unpublish"} onClick={() => void act("unpublish", "Taken offline.")}>
                    Unpublish
                  </Button>
                )}
                {entry.status !== "archived" && (
                  <Button
                    icon={<Archive className="size-4" />}
                    loading={busy === "archive"}
                    onClick={() => void act("archive", "Archived — hidden from the website but kept here.")}
                  >
                    Archive
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-[#b42318]"
                  icon={<Trash2 className="size-4" />}
                  onClick={async () => {
                    if (
                      !(await ask({
                        title: `Delete this ${def.singular.toLowerCase()}?`,
                        body: "It will be removed from the website and from this list. Archiving is usually the better choice.",
                        confirm: "Delete",
                        danger: true,
                      }))
                    )
                      return;
                    await api.del(`/api/admin/entries/${entry.id}`);
                    toast("success", "Deleted.");
                    navigate(`/admin/collections/${collection}`);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
      <Dialog open={!!history} onClose={() => setHistory(null)} title="Version history" size="lg">
        <ol className="divide-y divide-black/[0.06] rounded-xl ring-1 ring-black/[0.07]">
          {(history ?? []).map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[0.9rem]">
              <div>
                <p className="font-semibold">{{ save: "Saved", publish: "Published", restore: "Restored", import: "Imported" }[r.action] ?? r.action}</p>
                <p className="text-[0.8rem] text-muted">
                  {new Date(r.createdAt).toLocaleString()} {r.userName ? `· ${r.userName}` : ""}
                </p>
              </div>
              {i > 0 && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await api.post(`/api/admin/entries/${entry.id}/revisions/${r.id}/restore`);
                    setHistory(null);
                    await load();
                    toast("success", "Earlier version restored as a draft.");
                  }}
                >
                  Restore
                </Button>
              )}
            </li>
          ))}
          {history?.length === 0 && <li className="p-4 text-muted">No earlier versions yet.</li>}
        </ol>
      </Dialog>
      {blocker.state === "blocked" && (
        <Dialog
          open
          onClose={() => blocker.reset?.()}
          title="Leave without saving?"
          footer={
            <>
              <Button onClick={() => blocker.reset?.()}>Stay</Button>
              <Button variant="danger" onClick={() => blocker.proceed?.()}>
                Leave without saving
              </Button>
            </>
          }
        >
          You have unsaved changes.
        </Dialog>
      )}
      {element}
    </>
  );
}
