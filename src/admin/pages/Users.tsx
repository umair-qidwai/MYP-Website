import { useEffect, useState } from "react";
import { Copy, KeyRound, LogOut, UserPlus } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, Dialog, PageHeader, SelectInput, Spinner, TextInput, Toggle, timeAgo, useToast } from "../ui";

type U = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  canPublish: boolean;
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
  invited: boolean;
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<U[] | null>(null);
  const [edit, setEdit] = useState<U | null>(null);
  const [inviting, setInviting] = useState(false);
  const [link, setLink] = useState<{ link: string; expiresInHours: number; who: string } | null>(null);
  const load = () => api.get<{ users: U[] }>("/api/admin/users").then((r) => setUsers(r.users));
  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="People & access"
        description="Who can sign in and what they can do. Administrators can do everything. Editors can edit content; publishing is optional per editor."
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setInviting(true)}>
            Invite someone
          </Button>
        }
      />
      <Card>
        {!users ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-plum-soft font-bold text-plum">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {u.name} {u.id === me?.id && <span className="text-[0.8rem] font-medium text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-[0.82rem] text-muted">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={u.role === "admin" ? "plum" : "neutral"}>
                    {u.role === "admin" ? "Administrator" : u.canPublish ? "Editor · can publish" : "Editor"}
                  </Badge>
                  {u.status === "disabled" && <Badge tone="red">Disabled</Badge>}
                  {u.invited && <Badge tone="amber">Invitation pending</Badge>}
                </div>
                <p className="w-32 text-right text-[0.8rem] text-muted">{u.lastLoginAt ? `Active ${timeAgo(u.lastLoginAt)}` : "Never signed in"}</p>
                <Button size="sm" onClick={() => setEdit(u)}>
                  Manage
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onInvited={(l, who) => {
          setInviting(false);
          setLink({ ...l, who });
          void load();
        }}
      />
      {edit && (
        <EditUser
          u={edit}
          isMe={edit.id === me?.id}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            void load();
            toast("success", "Access updated.");
          }}
          onLink={(l) => {
            setEdit(null);
            setLink({ ...l, who: edit.name });
          }}
        />
      )}
      <Dialog
        open={!!link}
        onClose={() => setLink(null)}
        title="Share this link privately"
        footer={
          <Button variant="primary" onClick={() => setLink(null)}>
            Done
          </Button>
        }
      >
        <p className="text-[0.92rem] text-ink-2">
          Send this link to <strong>{link?.who}</strong> (for example by email or text message). It lets them choose their own password, works once, and expires
          in {link?.expiresInHours} hours.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={link?.link ?? ""}
            className="h-10 flex-1 rounded-lg border border-black/15 bg-black/[0.02] px-3 text-[0.85rem]"
            onFocus={(e) => e.target.select()}
            aria-label="Password link"
          />
          <Button
            icon={<Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard.writeText(link?.link ?? "");
              toast("success", "Link copied.");
            }}
          >
            Copy
          </Button>
        </div>
        <p className="mt-3 text-[0.8rem] text-muted">For security, this link won't be shown again. You can always create a new one.</p>
      </Dialog>
    </>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (l: { link: string; expiresInHours: number }, who: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [canPublish, setCanPublish] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRole("editor");
      setCanPublish(false);
      setError("");
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite someone"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api.post<{ link: string; expiresInHours: number }>("/api/admin/users", { name, email, role, canPublish });
                onInvited(r, name);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create invitation
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <SelectInput
          label="Access"
          value={role}
          onChange={(e) => setRole(e.target.value as "editor" | "admin")}
          options={[
            { value: "editor", label: "Editor — edits content" },
            { value: "admin", label: "Administrator — full access, including people & settings" },
          ]}
        />
        {role === "editor" && (
          <Toggle
            label="Can publish"
            help="Without this, their changes are saved as drafts for an administrator to publish."
            checked={canPublish}
            onChange={setCanPublish}
          />
        )}
      </div>
    </Dialog>
  );
}

function EditUser({
  u,
  isMe,
  onClose,
  onSaved,
  onLink,
}: {
  u: U;
  isMe: boolean;
  onClose: () => void;
  onSaved: () => void;
  onLink: (l: { link: string; expiresInHours: number }) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(u.name);
  const [role, setRole] = useState(u.role);
  const [canPublish, setCanPublish] = useState(u.canPublish);
  const [active, setActive] = useState(u.status === "active");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Manage ${u.name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.put(`/api/admin/users/${u.id}`, { name, role, canPublish: role === "admin" || canPublish, status: active ? "active" : "disabled" });
                onSaved();
              } catch (e) {
                toast("error", (e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <SelectInput
          label="Access"
          value={role}
          disabled={isMe}
          onChange={(e) => setRole(e.target.value as "editor" | "admin")}
          options={[
            { value: "editor", label: "Editor" },
            { value: "admin", label: "Administrator" },
          ]}
        />
        {role === "editor" && <Toggle label="Can publish" checked={canPublish} onChange={setCanPublish} />}
        {!isMe && <Toggle label="Account active" help="Turning this off signs them out everywhere and blocks sign-in." checked={active} onChange={setActive} />}
        <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-4">
          <Button
            size="sm"
            icon={<KeyRound className="size-3.5" />}
            onClick={async () => onLink(await api.post<{ link: string; expiresInHours: number }>(`/api/admin/users/${u.id}/reset-link`))}
          >
            Create password-reset link
          </Button>
          {!isMe && (
            <Button
              size="sm"
              icon={<LogOut className="size-3.5" />}
              onClick={async () => {
                await api.post(`/api/admin/users/${u.id}/sign-out`);
                toast("success", `${u.name} has been signed out on all devices.`);
              }}
            >
              Sign out everywhere
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
