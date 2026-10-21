import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Card, Dialog, PageHeader, Spinner, TextInput, Toggle, useToast } from "../ui";

type R = { id: number; from_path: string; to_path: string; status_code: number; source: string; created_at: string };

export default function Redirects() {
  const toast = useToast();
  const [items, setItems] = useState<R[] | null>(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const load = () => api.get<{ redirects: R[] }>("/api/admin/redirects").then((r) => setItems(r.redirects));
  useEffect(() => {
    void load();
  }, []);
  const list = useMemo(() => (items ?? []).filter((r) => !q || r.from_path.includes(q.toLowerCase()) || r.to_path.includes(q.toLowerCase())), [items, q]);
  return (
    <>
      <PageHeader
        title="Redirects"
        description="Send visitors from an old address to a new one. Addresses from the old Wix website were added automatically so existing links keep working."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Add redirect
          </Button>
        }
      />
      <Card>
        <div className="border-b border-black/[0.06] p-4">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search redirects</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search addresses"
              className="h-10 w-full rounded-lg border border-black/15 pl-9 pr-3 outline-none focus:border-plum focus:ring-[3px] focus:ring-plum/15"
            />
          </label>
        </div>
        {!items ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.88rem]">
              <thead className="text-[0.75rem] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Old address</th>
                  <th className="px-4 py-2 font-semibold">Goes to</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {list.slice(0, 400).map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[22rem] truncate px-4 py-2 font-mono text-[0.8rem]">{r.from_path}</td>
                    <td className="max-w-[18rem] truncate px-4 py-2 font-mono text-[0.8rem]">{r.to_path}</td>
                    <td className="px-4 py-2">
                      {r.source === "import" ? <Badge>From Wix</Badge> : <Badge tone="plum">{r.status_code === 301 ? "Permanent" : "Temporary"}</Badge>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#b42318]"
                        aria-label={`Delete redirect from ${r.from_path}`}
                        onClick={async () => {
                          await api.del(`/api/admin/redirects/${r.id}`);
                          setItems((l) => l?.filter((x) => x.id !== r.id) ?? null);
                          toast("success", "Redirect removed.");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length > 400 && <p className="p-4 text-[0.82rem] text-muted">Showing the first 400 — search to narrow down.</p>}
          </div>
        )}
      </Card>
      <AddRedirect open={adding} onClose={() => setAdding(false)} onSaved={() => (setAdding(false), void load(), toast("success", "Redirect saved."))} />
    </>
  );
}

function AddRedirect({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [permanent, setPermanent] = useState(true);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a redirect"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={async () => {
              setError("");
              try {
                await api.post("/api/admin/redirects", { from, to, permanent });
                setFrom("");
                setTo("");
                onSaved();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <TextInput label="Old address" placeholder="/old-page" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextInput label="Send visitors to" placeholder="/new-page or https://…" value={to} onChange={(e) => setTo(e.target.value)} error={error} />
        <Toggle label="Permanent" help="Use permanent unless the change is temporary." checked={permanent} onChange={setPermanent} />
      </div>
    </Dialog>
  );
}
