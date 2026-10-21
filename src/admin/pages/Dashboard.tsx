import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarPlus, FilePlus2, FileText, ImagePlus, Inbox, Newspaper, NotebookPen, Upload } from "lucide-react";
import { COLLECTIONS } from "@shared/collections";
import type { MediaItem } from "@shared/types";
import { api } from "../api";
import { useAuth } from "../auth";
import { Card, EmptyState, PageHeader, Spinner, timeAgo } from "../ui";

type Dash = {
  pages: { published: number; draft: number; archived: number; unpublishedChanges: number };
  entries: { collection: string; status: string; n: number }[];
  mediaCount: number;
  newSubmissions: number | null;
  recent: { action: string; entity_type: string | null; entity_id: string | null; detail: string | null; user_email: string | null; created_at: string }[];
  recentUploads: MediaItem[];
};

const ACTIONS: Record<string, string> = {
  "page.publish": "published a page",
  "page.unpublish": "unpublished a page",
  "page.create": "created a page",
  "page.delete": "moved a page to the bin",
  "page.restore": "restored a page",
  "page.move": "changed a page address",
  "page.revision.restore": "restored an earlier version",
  "entry.publish": "published",
  "entry.unpublish": "unpublished",
  "entry.create": "created",
  "entry.archive": "archived",
  "entry.delete": "deleted",
  "entry.reorder": "reordered",
  "media.upload": "uploaded",
  "media.delete": "deleted a file",
  "settings.update": "updated site settings",
  "user.invite": "invited",
  "user.update": "updated access for",
  "user.reset-link": "created a password link for",
  "redirect.save": "saved a redirect",
  "redirect.delete": "removed a redirect",
  "submission.delete": "deleted a form submission",
  "account.locked": "account locked after failed sign-ins",
  "password.changed": "changed their password",
  "password.reset": "reset their password",
  "invite.accepted": "accepted their invitation",
  "user.cli-link": "created a sign-in link (command line) for",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get<Dash>("/api/admin/dashboard").then(setD, (e) => setError(e.message));
  }, []);
  if (error) return <p className="text-[#b42318]">{error}</p>;
  if (!d) return <Spinner />;
  const count = (c: string, s: string) => d.entries.find((e) => e.collection === c && e.status === s)?.n ?? 0;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader title={`${greet}, ${user?.name.split(" ")[0]}`} description="Here's what's happening on the website." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat to="/admin/pages" label="Published pages" value={d.pages.published} />
        <Stat
          to="/admin/pages"
          label="Draft pages"
          value={d.pages.draft}
          note={
            d.pages.unpublishedChanges
              ? `${d.pages.unpublishedChanges} live page${d.pages.unpublishedChanges === 1 ? "" : "s"} with unpublished edits`
              : undefined
          }
        />
        <Stat to="/admin/collections/events" label="Published events" value={count("events", "published")} />
        <Stat to="/admin/media" label="Images & files" value={d.mediaCount} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Quick actions" className="xl:col-span-1">
          <ul className="divide-y divide-black/[0.06]">
            <Quick to="/admin/collections/articles?new=1" icon={NotebookPen} label="Write an article" />
            <Quick to="/admin/collections/events?new=1" icon={CalendarPlus} label="Add an event" />
            <Quick to="/admin/collections/news?new=1" icon={Newspaper} label="Add a news story" />
            <Quick to="/admin/collections/reports?new=1" icon={Upload} label="Upload a report" />
            <Quick to="/admin/media" icon={ImagePlus} label="Upload images" />
            <Quick to="/admin/pages?new=1" icon={FilePlus2} label="Create a page" />
            {d.newSubmissions !== null && (
              <Quick to="/admin/submissions" icon={Inbox} label={`Form submissions${d.newSubmissions ? ` (${d.newSubmissions} new)` : ""}`} />
            )}
          </ul>
        </Card>

        <Card title="Recent changes" className="xl:col-span-2">
          {d.recent.length === 0 ? (
            <EmptyState icon={<FileText className="size-5" />} title="No changes yet" description="Edits, publishing and uploads will appear here." />
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {d.recent.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-4 px-5 py-3 text-[0.9rem]">
                  <p className="min-w-0">
                    <span className="font-semibold">{r.user_email?.split("@")[0] ?? "Import"}</span>{" "}
                    <span className="text-ink-2">{ACTIONS[r.action] ?? r.action}</span>{" "}
                    {r.detail && (
                      <span className="font-medium">{r.entity_type && COLLECTIONS.some((c) => c.key === r.entity_type) ? `“${r.detail}”` : r.detail}</span>
                    )}
                  </p>
                  <time className="shrink-0 text-[0.8rem] text-muted" dateTime={r.created_at}>
                    {timeAgo(r.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Content collections" className="xl:col-span-1">
          <ul className="divide-y divide-black/[0.06]">
            {COLLECTIONS.map((c) => (
              <li key={c.key}>
                <Link to={`/admin/collections/${c.key}`} className="flex items-center justify-between px-5 py-3 text-[0.9rem] hover:bg-black/[0.02]">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted">
                    {count(c.key, "published")} live{count(c.key, "draft") ? ` · ${count(c.key, "draft")} draft` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="Recent uploads"
          className="xl:col-span-2"
          actions={
            <Link to="/admin/media" className="text-[0.85rem] font-semibold text-plum">
              Open library
            </Link>
          }
        >
          {d.recentUploads.length === 0 ? (
            <EmptyState title="No files yet" />
          ) : (
            <ul className="grid grid-cols-4 gap-3 p-5 sm:grid-cols-8">
              {d.recentUploads.map((m) => (
                <li key={m.id} className="aspect-square overflow-hidden rounded-lg bg-black/[0.04] ring-1 ring-black/[0.06]">
                  {m.mime.startsWith("image/") ? (
                    <img src={m.variants[0]?.url ?? m.url} alt={m.alt} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center text-[0.7rem] font-semibold text-muted">{m.mime.split("/")[1].toUpperCase()}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ to, label, value, note }: { to: string; label: string; value: number; note?: string }) {
  return (
    <Link to={to} className="group rounded-xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.07] transition hover:ring-plum/40">
      <p className="text-[0.85rem] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[2rem] font-bold tracking-[-0.03em]">{value.toLocaleString()}</p>
      {note && <p className="mt-1 text-[0.8rem] font-medium text-[#8a5300]">{note}</p>}
    </Link>
  );
}

function Quick({ to, icon: Icon, label }: { to: string; icon: typeof FileText; label: string }) {
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 px-5 py-3 text-[0.92rem] font-medium hover:bg-black/[0.02]">
        <span className="grid size-8 place-items-center rounded-lg bg-plum-soft text-plum">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="flex-1">{label}</span>
        <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
