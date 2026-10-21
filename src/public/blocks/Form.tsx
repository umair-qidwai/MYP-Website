import { useId, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { BlockOf } from "@shared/blocks";
import { postJson } from "../../lib/api";
import { Turnstile } from "../components/Turnstile";
import { useSite } from "../SiteContext";
import { Section } from "./Content";

/**
 * Forms built in the CMS. Submissions are validated and stored by the Worker; the success
 * message only appears after the server confirms it saved the submission.
 */
export function FormBlock({ block, path }: { block: BlockOf<"form">; path: string }) {
  const { turnstileSiteKey, preview } = useSite();
  const uid = useId();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resetKey, setResetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (preview) {
      setState("error");
      setMessage("This is a preview — forms can only be submitted on the published page.");
      return;
    }
    setState("sending");
    setFieldErrors({});
    try {
      const r = await postJson<{ ok: boolean; message: string }>("/api/public/forms/submit", { path, formId: block.id, values, turnstileToken: token ?? undefined, website: honeypot });
      setState("done");
      setMessage(r.message || block.successMessage);
    } catch (err) {
      const e2 = err as Error & { details?: Record<string, string> };
      setState("error");
      setMessage(e2.message);
      if (e2.details && typeof e2.details === "object" && !Array.isArray(e2.details)) setFieldErrors(e2.details);
      setResetKey((k) => k + 1);
      setToken(null);
    }
  }

  return (
    <Section>
      <div className="wrap grid md:grid-cols-12">
        <div className="md:col-span-10 md:col-start-2 lg:col-span-7 lg:col-start-3">
          <div className="rounded-[28px] bg-white p-6 ring-1 ring-ink/5 sm:p-10">
            <h2 className="display text-[clamp(1.8rem,3.4vw,2.6rem)]">{block.title}</h2>
            {block.intro && <p className="mt-3 text-ink-2">{block.intro}</p>}
            {state === "done" ? (
              <div role="status" className="mt-8 flex items-start gap-3 rounded-2xl bg-leaf/10 p-5 text-ink">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                <p>{message}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 grid gap-5" noValidate={false}>
                {block.fields.map((f) => {
                  const id = `${uid}-${f.id}`;
                  const err = fieldErrors[f.id];
                  const common = {
                    id,
                    name: f.id,
                    required: f.required,
                    "aria-invalid": err ? true : undefined,
                    "aria-describedby": err ? `${id}-err` : undefined,
                    className: "w-full rounded-xl border border-ink/20 bg-paper/40 px-4 py-3 text-base outline-none transition focus:border-plum focus:bg-white focus:ring-4 focus:ring-plum/15",
                  };
                  if (f.type === "checkbox") {
                    return (
                      <label key={f.id} htmlFor={id} className="flex items-start gap-3 text-[0.98rem]">
                        <input type="checkbox" {...common} className="mt-1 size-5 accent-plum" checked={!!values[f.id]} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.checked }))} />
                        <span>
                          {f.label}
                          {f.required && <span aria-hidden className="text-terracotta"> *</span>}
                        </span>
                      </label>
                    );
                  }
                  return (
                    <div key={f.id}>
                      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
                        {f.label}
                        {f.required ? <span className="text-terracotta"> *</span> : <span className="font-normal text-muted"> (optional)</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea {...common} rows={5} placeholder={f.placeholder} value={String(values[f.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />
                      ) : f.type === "select" ? (
                        <select {...common} value={String(values[f.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}>
                          <option value="">Choose…</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          {...common}
                          type={f.type}
                          autoComplete={f.type === "email" ? "email" : f.type === "tel" ? "tel" : /name/i.test(f.label) ? "name" : undefined}
                          placeholder={f.placeholder}
                          value={String(values[f.id] ?? "")}
                          onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                        />
                      )}
                      {err && (
                        <p id={`${id}-err`} className="mt-1.5 text-sm text-terracotta">
                          {err}
                        </p>
                      )}
                    </div>
                  );
                })}
                {/* Honeypot: hidden from people, tempting for bots */}
                <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </label>
                </div>
                <Turnstile siteKey={turnstileSiteKey} onToken={setToken} resetKey={resetKey} action="form" />
                {block.privacyNote && <p className="text-sm text-muted">{block.privacyNote}</p>}
                {state === "error" && (
                  <p role="alert" className="flex items-start gap-2 rounded-xl bg-terracotta/10 p-4 text-sm text-ink">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-terracotta" aria-hidden />
                    {message}
                  </p>
                )}
                <div>
                  <button
                    type="submit"
                    disabled={state === "sending"}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-7 font-semibold text-paper transition-colors hover:bg-plum disabled:opacity-60"
                  >
                    {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {state === "sending" ? "Sending…" : block.submitLabel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
