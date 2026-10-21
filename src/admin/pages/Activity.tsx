import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, PageHeader, Spinner } from "../ui";

type A = {
  id: number;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

export default function Activity() {
  const [rows, setRows] = useState<A[] | null>(null);
  useEffect(() => {
    api.get<{ activity: A[] }>("/api/admin/activity").then((r) => setRows(r.activity));
  }, []);
  return (
    <>
      <PageHeader title="Activity log" description="A record of sign-ins and important changes, for accountability. The latest 300 events are shown." />
      <Card>
        {!rows ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.86rem]">
              <thead className="text-[0.75rem] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">When</th>
                  <th className="px-4 py-2 font-semibold">Who</th>
                  <th className="px-4 py-2 font-semibold">What</th>
                  <th className="px-4 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{r.user_email ?? "System"}</td>
                    <td className="px-4 py-2 font-mono text-[0.78rem]">{r.action}</td>
                    <td className="max-w-[28rem] truncate px-4 py-2">{[r.entity_type, r.detail].filter(Boolean).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
