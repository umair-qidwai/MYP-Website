import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button, Card, PageHeader, TextInput, useToast } from "../ui";

export default function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader title="My account" description={`Signed in as ${user?.email}.`} />
      <Card title="Change password" className="max-w-xl">
        <form
          className="grid gap-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (next !== again) return setError("The new passwords don't match.");
            setBusy(true);
            try {
              await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
              setCurrent("");
              setNext("");
              setAgain("");
              toast("success", "Password changed. You've been signed out on your other devices.");
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <TextInput
            label="New password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            help="At least 12 characters."
            required
          />
          <TextInput
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            error={error}
            required
          />
          <Button type="submit" variant="primary" loading={busy} className="justify-self-start">
            Change password
          </Button>
        </form>
      </Card>
    </>
  );
}
