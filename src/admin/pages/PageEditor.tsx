import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { ArrowLeft, Check, Columns2, ExternalLink, Eye, History, MoreHorizontal, PanelLeft, Save, Send, Settings2, Trash2, Undo2 } from "lucide-react";
import { LANGUAGES, type PageDoc } from "@shared/blocks";
import type { PublicEntry, PublicPagePayload } from "@shared/types";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import {
  Badge,
  Button,
  Card,
  Dialog,
  PageHeader,
  SelectInput,
  Spinner,
  StatusBadge,
  TextArea,
  TextInput,
  Toggle,
  cx,
  timeAgo,
  useConfirm,
  useToast,
} from "../ui";
import { BlockList, type BlockErrors } from "../editor/BlockList";
import { LivePreview } from "../editor/Preview";
import { FieldsForm } from "../editor/fields";

type PageData = { id: string; path: string; title: string; status: string; hasChanges: boolean; publishedAt: string | null; updatedAt: string; doc: PageDoc };
type Revision = { id: number; action: string; title: string | null; createdAt: string; userName: string | null };

export default function PageEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { ask, element: confirmEl } = useConfirm();
  const [page, setPage] = useState<PageData | null>(null);
  const [doc, setDoc] = useState<PageDoc | null>(null);
  const [path, setPath] = useState("");
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "unpublish">("");
  const [errors, setErrors] = useState<BlockErrors>({});
  const [view, setView] = useState<"split" | "edit" | "preview">(() => (typeof window !== "undefined" && window.innerWidth >= 1280 ? "split" : "edit"));
  const [focus, setFocus] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collections, setCollections] = useState<Record<string, PublicEntry[]>>({});
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ page: PageData }>(`/api/admin/pages/${id}`);
      setPage(r.page);
      setDoc(r.page.doc);
      setPath(r.page.path);
      setSaved(JSON.stringify({ doc: r.page.doc, path: r.page.path }));
      api.get<PublicPagePayload>(`/api/admin/pages/${id}/preview`).then(
        (p) => p.kind === "page" && setCollections(p.collections),
        () => {},
      );
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const dirty = !!doc && JSON.stringify({ doc, path }) !== saved;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  const blocker = useBlocker(dirty);

  const save = useCallback(async (): Promise<boolean> => {
    if (!doc || !page) return false;
    setBusy("save");
    setErrors({});
    try {
      await api.put(`/api/admin/pages/${page.id}`, { doc, path });
      setSaved(JSON.stringify({ doc, path }));
      setPage((p) =>
        p ? { ...p, path, title: doc.title, hasChanges: p.status === "published" ? true : p.hasChanges, updatedAt: new Date().toISOString() } : p,
      );
      toast("success", page.status === "published" ? "Draft saved. Visitors still see the live version until you publish." : "Draft saved.");
      return true;
    } catch (e) {
      const err = e as ApiError;
      const details = err.details as { path: string; message: string }[] | undefined;
      const blockErrors: BlockErrors = {};
      for (const d of details ?? []) {
        const m = d.path.match(/^doc\.blocks\.(\d+)/);
        if (m) blockErrors[Number(m[1])] = d.message;
      }
      setErrors(blockErrors);
      toast("error", Object.keys(blockErrors).length ? `Some sections need attention: ${err.message}` : err.message);
      return false;
    } finally {
      setBusy("");
    }
  }, [doc, page, path, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function publish() {
    if (!page) return;
    if (dirty && !(await save())) return;
    setBusy("publish");
    try {
      await api.post(`/api/admin/pages/${page.id}/publish`);
      setPage({ ...page, status: "published", hasChanges: false, publishedAt: new Date().toISOString() });
      toast("success", "Published! The changes are now live on the website.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function unpublish() {
    if (!page) return;
    if (
      !(await ask({
        title: "Take this page offline?",
        body: "Visitors will no longer be able to see this page. You can publish it again at any time.",
        confirm: "Unpublish",
      }))
    )
      return;
    setBusy("unpublish");
    try {
      await api.post(`/api/admin/pages/${page.id}/unpublish`);
      setPage({ ...page, status: "draft", hasChanges: true });
      toast("success", "The page is now offline.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function openPreview() {
    if (dirty && !(await save())) return;
    window.open(`/preview/${path}`, "_blank", "noopener");
  }

  const previewPane = useMemo(() => (doc ? <LivePreview path={path} doc={doc} collections={collections} /> : null), [doc, path, collections]);
  const scroller = useRef<HTMLDivElement>(null);

  if (loadError) return <p className="text-[#b42318]">{loadError}</p>;
  if (!page || !doc) return <Spinner />;
  const canPublish = !!user?.canPublish;
  const isHome = page.path === "";

  return (
    <>
      <PageHeader
        back={
          <Link to="/admin/pages" className="mb-2 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> All pages
          </Link>
        }
        title={isHome ? "Homepage" : doc.title || "Untitled page"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={page.status} hasChanges={page.hasChanges || dirty} />
            <span>/{path}</span>
            {page.status === "published" && (
              <a href={`/${path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-plum hover:underline">
                View live <ExternalLink className="size-3.5" />
              </a>
            )}
            {dirty ? <Badge tone="amber">Unsaved changes</Badge> : <span className="text-muted">Saved {timeAgo(page.updatedAt)}</span>}
          </span>
        }
        actions={
          <>
            <div className="hidden rounded-lg bg-black/[0.05] p-0.5 md:flex" role="group" aria-label="Editor layout">
              {(
                [
                  ["edit", "Edit", PanelLeft],
                  ["split", "Side by side", Columns2],
                  ["preview", "Preview", Eye],
                ] as const
              ).map(([k, l, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  aria-pressed={view === k}
                  className={cx(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.82rem] font-semibold",
                    view === k ? "bg-white shadow-sm" : "text-ink-2",
                  )}
                >
                  <Icon className="size-3.5" /> {l}
                </button>
              ))}
            </div>
            <Button icon={<Settings2 className="size-4" />} onClick={() => setSettingsOpen(true)}>
              Page settings
            </Button>
            <Button icon={<History className="size-4" />} onClick={() => setHistoryOpen(true)} aria-label="Version history">
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button icon={<Eye className="size-4" />} onClick={() => void openPreview()} className="md:hidden">
              Preview
            </Button>
            <Button icon={<Save className="size-4" />} loading={busy === "save"} disabled={!dirty} onClick={() => void save()}>
              Save draft
            </Button>
            {canPublish && (
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                loading={busy === "publish"}
                disabled={page.status === "published" && !page.hasChanges && !dirty}
                onClick={() => void publish()}
              >
                {page.status === "published" ? "Publish changes" : "Publish"}
              </Button>
            )}
            <PageMenu
              canUnpublish={canPublish && page.status === "published" && !isHome}
              canDiscard={page.status === "published" && (page.hasChanges || dirty)}
              canDelete={user?.role === "admin" && !isHome}
              onPreview={() => void openPreview()}
              onUnpublish={() => void unpublish()}
              onDiscard={async () => {
                if (
                  !(await ask({
                    title: "Discard all draft changes?",
                    body: "The page will go back to exactly what visitors currently see.",
                    confirm: "Discard changes",
                    danger: true,
                  }))
                )
                  return;
                await api.post(`/api/admin/pages/${page.id}/discard`);
                toast("success", "Draft changes discarded.");
                await load();
              }}
              onDelete={async () => {
                if (
                  !(await ask({
                    title: "Move this page to the bin?",
                    body: "The page will disappear from the website. Administrators can restore it from the bin.",
                    confirm: "Move to bin",
                    danger: true,
                  }))
                )
                  return;
                await api.del(`/api/admin/pages/${page.id}`);
                toast("success", "Page moved to the bin.");
                navigate("/admin/pages");
              }}
            />
          </>
        }
      />
      {!canPublish && (
        <p className="mb-4 rounded-lg bg-plum-soft/60 px-4 py-3 text-[0.88rem] text-ink-2">
          You can edit and save drafts. An administrator will publish your changes.
        </p>
      )}

      <div className={cx("grid gap-6", view === "split" && "xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]")}>
        {view !== "preview" && (
          <div className="min-w-0">
            <BlockList blocks={doc.blocks} errors={errors} focus={focus} onFocus={setFocus} onChange={(blocks) => setDoc({ ...doc, blocks })} />
          </div>
        )}
        {view !== "edit" && (
          <div className="min-w-0">
            <div className="sticky top-4">
              <div className="mb-2 flex items-center justify-between text-[0.8rem] text-muted">
                <span>Live preview{dirty ? " (unsaved)" : ""}</span>
                <button type="button" onClick={() => void openPreview()} className="inline-flex items-center gap-1 font-semibold text-plum hover:underline">
                  Open full preview <ExternalLink className="size-3" />
                </button>
              </div>
              <div
                ref={scroller}
                className="h-[calc(100svh-12rem)] overflow-y-auto overflow-x-hidden rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.08]"
              >
                {previewPane}
              </div>
            </div>
          </div>
        )}
      </div>

      <PageSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        doc={doc}
        setDoc={setDoc}
        path={path}
        setPath={setPath}
        isHome={isHome}
        canMove={user?.role === "admin" || page.status !== "published"}
      />
      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        pageId={page.id}
        onRestored={async () => {
          await load();
          toast("success", "Earlier version restored as a draft. Review it, then publish.");
        }}
      />
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
              <Button
                variant="primary"
                onClick={async () => {
                  if (await save()) blocker.proceed?.();
                }}
              >
                Save and leave
              </Button>
            </>
          }
        >
          You have changes on this page that haven't been saved.
        </Dialog>
      )}
      {confirmEl}
    </>
  );
}

function PageMenu(props: {
  canUnpublish: boolean;
  canDiscard: boolean;
  canDelete: boolean;
  onPreview: () => void;
  onUnpublish: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Open preview in new tab", icon: Eye, run: props.onPreview, show: true },
    { label: "Discard draft changes", icon: Undo2, run: props.onDiscard, show: props.canDiscard },
    { label: "Unpublish (take offline)", icon: Undo2, run: props.onUnpublish, show: props.canUnpublish },
    { label: "Move to bin", icon: Trash2, run: props.onDelete, show: props.canDelete, danger: true },
  ].filter((i) => i.show);
  return (
    <div className="relative">
      <Button aria-label="More actions" aria-expanded={open} onClick={() => setOpen(!open)} icon={<MoreHorizontal className="size-4" />} />
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-xl bg-white p-1 shadow-xl ring-1 ring-black/10" role="menu">
            {items.map((i) => (
              <li key={i.label}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    i.run();
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[0.88rem] hover:bg-black/[0.04]",
                    i.danger && "text-[#b42318]",
                  )}
                >
                  <i.icon className="size-4" /> {i.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PageSettingsDialog({
  open,
  onClose,
  doc,
  setDoc,
  path,
  setPath,
  isHome,
  canMove,
}: {
  open: boolean;
  onClose: () => void;
  doc: PageDoc;
  setDoc: (d: PageDoc) => void;
  path: string;
  setPath: (p: string) => void;
  isHome: boolean;
  canMove: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Page settings"
      size="lg"
      footer={
        <Button variant="primary" icon={<Check className="size-4" />} onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid gap-5">
        <TextInput
          label="Page title"
          value={doc.title}
          onChange={(e) => setDoc({ ...doc, title: e.target.value })}
          help="Shown as the big heading at the top of the page and in the browser tab."
        />
        {!isHome && (
          <TextInput
            label="Web address"
            value={path}
            disabled={!canMove}
            onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9/-]/g, "-"))}
            help={
              canMove
                ? "Changing the address of a live page automatically sends visitors from the old address to the new one."
                : "Only administrators can change the address of a live page."
            }
          />
        )}
        <TextInput
          label="Short introduction under the title"
          optional
          value={doc.intro ?? ""}
          onChange={(e) => setDoc({ ...doc, intro: e.target.value || undefined })}
        />
        <Toggle
          label="Hide the page title"
          help="Use this when the first section already has a big headline."
          checked={!!doc.hideTitle}
          onChange={(v) => setDoc({ ...doc, hideTitle: v || undefined })}
        />
        <SelectInput
          label="Language of this page"
          value={doc.lang ?? "en"}
          onChange={(e) => setDoc({ ...doc, lang: e.target.value === "en" ? undefined : (e.target.value as PageDoc["lang"]) })}
          options={Object.entries(LANGUAGES).map(([k, v]) => ({ value: k, label: v.label }))}
          help="Translated pages use addresses like es/free-clinic. A language switcher appears automatically."
        />
        <Card title="Search engines & sharing" className="!shadow-none">
          <div className="grid gap-4 p-4">
            <TextInput
              label="Search result title"
              optional
              value={doc.seo.title ?? ""}
              onChange={(e) => setDoc({ ...doc, seo: { ...doc.seo, title: e.target.value || undefined } })}
              help={`${(doc.seo.title ?? "").length}/60 characters recommended`}
            />
            <TextArea
              label="Search result description"
              optional
              rows={3}
              value={doc.seo.description ?? ""}
              onChange={(e) => setDoc({ ...doc, seo: { ...doc.seo, description: e.target.value || undefined } })}
              help={`${(doc.seo.description ?? "").length}/160 characters recommended`}
            />
            <FieldsForm
              fields={[{ key: "image", label: "Image when shared on social media", kind: "image", optional: true }]}
              value={{ image: doc.seo.image }}
              onChange={(v) => setDoc({ ...doc, seo: { ...doc.seo, image: v.image as PageDoc["seo"]["image"] } })}
            />
            <Toggle
              label="Hide from search engines"
              checked={!!doc.seo.noindex}
              onChange={(v) => setDoc({ ...doc, seo: { ...doc.seo, noindex: v || undefined } })}
            />
          </div>
        </Card>
      </div>
    </Dialog>
  );
}

const ACTION_LABEL: Record<string, string> = { save: "Saved draft", publish: "Published", restore: "Restored", import: "Imported from Wix" };

function HistoryDialog({ open, onClose, pageId, onRestored }: { open: boolean; onClose: () => void; pageId: string; onRestored: () => void }) {
  const toast = useToast();
  const [revs, setRevs] = useState<Revision[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    if (open)
      api.get<{ revisions: Revision[] }>(`/api/admin/pages/${pageId}/revisions`).then(
        (r) => setRevs(r.revisions),
        (e) => toast("error", e.message),
      );
  }, [open, pageId, toast]);
  return (
    <Dialog open={open} onClose={onClose} title="Version history" size="lg">
      <p className="mb-4 text-[0.88rem] text-muted">
        Every save and publish is kept. Restoring a version puts it back into the draft — nothing changes on the live site until you publish.
      </p>
      {!revs ? (
        <Spinner />
      ) : (
        <ol className="divide-y divide-black/[0.06] rounded-xl ring-1 ring-black/[0.07]">
          {revs.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[0.9rem]">
              <div>
                <p className="font-semibold">
                  {ACTION_LABEL[r.action] ?? r.action}
                  {i === 0 && <span className="ml-2 text-[0.75rem] font-medium text-muted">(latest)</span>}
                </p>
                <p className="text-[0.8rem] text-muted">
                  {new Date(r.createdAt).toLocaleString()} {r.userName ? `· ${r.userName}` : ""}
                </p>
              </div>
              {i > 0 && (
                <Button
                  size="sm"
                  loading={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    try {
                      await api.post(`/api/admin/pages/${pageId}/revisions/${r.id}/restore`);
                      onClose();
                      onRestored();
                    } catch (e) {
                      toast("error", (e as Error).message);
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Restore this version
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
