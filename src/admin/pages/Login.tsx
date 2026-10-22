import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import type { SessionUser } from "@shared/types";
import { Turnstile } from "../../public/components/Turnstile";
import { useAuth } from "../auth";
import { Button, TextInput } from "../ui";

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-[25rem]">
        <div className="mb-8 flex items-center gap-3">
          <img src="/static/brand/logo.png" alt="" width={40} height={40} className="size-10 object-contain" />
          <span className="text-[1.05rem] font-bold">MY Project USA</span>
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-[0_20px_50px_-25px_rgb(0_0_0/0.25)] ring-1 ring-black/[0.07]">
          <h1 className="text-[1.45rem] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-1 text-[0.92rem] text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-[0.82rem] text-muted">
          <a href="/" className="hover:text-ink">
            ← Back to the website
          </a>
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, signedIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next") || "/admin/";
  if (user) return <Navigate to={next.startsWith("/") ? next : "/admin/"} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password, turnstileToken: token ?? undefined }),
      });
      const data = (await res.json()) as { user?: SessionUser; csrfToken?: string; error?: string };
      if (!res.ok || !data.user || !data.csrfToken) throw new Error(data.error ?? "Sign-in failed.");
      signedIn(data.user, data.csrfToken);
      navigate(next.startsWith("/") ? next : "/admin/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setResetKey((k) => k + 1);
      setToken(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Edit pages, events, news and more.">
      <form onSubmit={submit} className="grid gap-4">
        <TextInput label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextInput label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <TurnstileFromConfig onToken={setToken} resetKey={resetKey} />
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#fde7e5] p-3 text-[0.88rem] text-[#7a1a12]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} className="mt-1 h-11 w-full" icon={<Lock className="size-4" />}>
          Sign in
        </Button>
        <p className="text-center text-[0.82rem] text-muted">Forgot your password? Ask an administrator for a reset link.</p>
      </form>
    </AuthCard>
  );
}

/** The Turnstile site key is public; the admin shell reads it from a small config endpoint. */
function TurnstileFromConfig({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey: number }) {
  const [key, setKey] = useState<string>("");
  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json() as Promise<{ turnstileSiteKey: string }>)
      .then((d) => setKey(d.turnstileSiteKey))
      .catch(() => setKey(""));
  }, []);
  if (!key) return null;
  return <Turnstile siteKey={key} onToken={onToken} resetKey={resetKey} action="login" />;
}

export function SetPasswordPage() {
  const token = typeof location !== "undefined" ? (new URLSearchParams(location.hash.slice(1)).get("token") ?? "") : "";
  const [info, setInfo] = useState<{ valid: boolean; email?: string; name?: string; purpose?: string } | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false }));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't set the password.");
      setDone(true);
      history.replaceState(null, "", "/admin/set-password");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!info) return <AuthCard title="Checking your link…">{null}</AuthCard>;
  if (done)
    return (
      <AuthCard title="You're all set">
        <p className="flex items-start gap-2 text-[0.93rem]">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#1d6b36]" /> Your password has been saved. You can now sign in.
        </p>
        <Link to="/admin/login" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#2d1b4e] px-4 font-semibold text-white">
          Go to sign in
        </Link>
      </AuthCard>
    );
  if (!info.valid)
    return (
      <AuthCard title="This link has expired">
        <p className="text-[0.93rem] text-ink-2">Password links work once and expire after a short time. Ask an administrator to send you a new one.</p>
      </AuthCard>
    );
  return (
    <AuthCard title={info.purpose === "invite" ? `Welcome, ${info.name}` : "Choose a new password"} subtitle={info.email}>
      <form onSubmit={submit} className="grid gap-4">
        <TextInput
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          help="At least 12 characters. A short sentence you'll remember works well."
        />
        <TextInput label="Repeat password" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {error && (
          <p role="alert" className="rounded-lg bg-[#fde7e5] p-3 text-[0.88rem] text-[#7a1a12]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} className="h-11">
          Save password
        </Button>
      </form>
    </AuthCard>
  );
}
