import { useEffect, useState } from "react";
import { Archive, Download, Inbox, Trash2 } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, cx, timeAgo, useConfirm, useToast } from "../ui";

type Sub = {
  id: string;
  formTitle: string;
  pagePath: string;
  status: "new" | "read" | "archived";
  createdAt: string;
  data: { label: string; value: string | boolean }[];
};

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export default function Submissions() {
  const toast = useToast();
  const { ask, element } = useConfirm();
  const [box, setBox] = useState<"inbox" | "archived">("inbox");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api.get<{ submissions: Sub[] }>(`/api/admin/submissions?status=${box}`).then((r) => setSubs(r.submissions));
  useEffect(() => {
    setSubs(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  const setStatus = async (s: Sub, status: Sub["status"]) => {
    await api.put(`/api/admin/submissions/${s.id}`, { status });
    setSubs(
      (list) =>
        (box === "inbox" && status === "archived" ? list?.filter((x) => x.id !== s.id) : list?.map((x) => (x.id === s.id ? { ...x, status } : x))) ?? null,
    );
  };

  function exportCsv() {
    if (!subs?.length) return;
    const labels = [...new Set(subs.flatMap((s) => s.data.map((d) => d.label)))];
    const rows = [
      ["Received", "Form", "Page", ...labels],
      ...subs.map((s) => [
        new Date(s.createdAt).toLocaleString(),
        s.formTitle,
        `/${s.pagePath}`,
        ...labels.map((l) => s.data.find((d) => d.label === l)?.value ?? ""),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `form-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader
        title="Form submissions"
        description="Messages sent through forms on the website. They may contain personal information — handle them with care and delete what you no longer need."
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={!subs?.length}>
            Download spreadsheet
          </Button>
        }
      />
      <div className="mb-4 flex gap-1">
        {(["inbox", "archived"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBox(b)}
            aria-pressed={box === b}
            className={cx(
              "rounded-lg px-3 py-1.5 text-[0.85rem] font-semibold capitalize",
              box === b ? "bg-[#2d1b4e] text-white" : "text-ink-2 hover:bg-black/[0.05]",
            )}
          >
            {b}
          </button>
        ))}
      </div>
      <Card>
        {!subs ? (
          <Spinner />
        ) : subs.length === 0 ? (
          <EmptyState icon={<Inbox className="size-5" />} title="Nothing here" description="New form submissions will appear here." />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {subs.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(open === s.id ? null : s.id);
                    if (s.status === "new") void setStatus(s, "read");
                  }}
                  aria-expanded={open === s.id}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-black/[0.015]"
                >
                  <span
                    className={cx("size-2 shrink-0 rounded-full", s.status === "new" ? "bg-plum" : "bg-transparent")}
                    aria-label={s.status === "new" ? "New" : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.formTitle}</span>
                    <span className="block truncate text-[0.82rem] text-muted">
                      {s.data
                        .slice(0, 2)
                        .map((d) => String(d.value))
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {s.status === "new" && <Badge tone="plum">New</Badge>}
                  <span className="shrink-0 text-[0.8rem] text-muted">{timeAgo(s.createdAt)}</span>
                </button>
                {open === s.id && (
                  <div className="border-t border-black/[0.05] bg-black/[0.015] px-4 py-4 sm:pl-10">
                    <dl className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                      {s.data.map((d, i) => (
                        <div key={i} className="contents">
                          <dt className="text-[0.82rem] font-semibold text-muted">{d.label}</dt>
                          <dd className="whitespace-pre-wrap break-words text-[0.92rem]">
                            {typeof d.value === "boolean" ? (d.value ? "Yes" : "No") : d.value || "—"}
                          </dd>
                        </div>
                      ))}
                      <dt className="text-[0.82rem] font-semibold text-muted">Sent from</dt>
                      <dd className="text-[0.92rem]">
                        /{s.pagePath} · {new Date(s.createdAt).toLocaleString()}
                      </dd>
                    </dl>
                    <div className="mt-4 flex gap-2">
                      {s.status !== "archived" && (
                        <Button size="sm" icon={<Archive className="size-3.5" />} onClick={() => void setStatus(s, "archived")}>
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#b42318]"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={async () => {
                          if (!(await ask({ title: "Delete this submission?", body: "It will be permanently deleted.", confirm: "Delete", danger: true })))
                            return;
                          await api.del(`/api/admin/submissions/${s.id}`);
                          setSubs((l) => l?.filter((x) => x.id !== s.id) ?? null);
                          toast("success", "Deleted.");
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {element}
    </>
  );
}
