/** Small, accessible UI kit for the admin dashboard. Calm, clear, consistent. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ── Button ──────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-[#2d1b4e] text-white hover:bg-plum shadow-sm",
  secondary: "bg-white text-ink ring-1 ring-inset ring-black/12 hover:bg-black/[0.03] shadow-sm",
  ghost: "text-ink hover:bg-black/[0.05]",
  subtle: "bg-plum-soft text-plum hover:bg-[#ddd1ee]",
  danger: "bg-[#b42318] text-white hover:bg-[#912018] shadow-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" ? "h-8 px-3 text-[0.82rem]" : "h-10 px-4 text-[0.9rem]",
        btnVariants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

// ── Form fields ─────────────────────────────────────────────────────────────
export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
  optional,
}: {
  label: string;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.85rem] font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {help && !error && <p className="text-[0.8rem] leading-snug text-muted">{help}</p>}
      {error && (
        <p className="text-[0.8rem] font-medium text-[#b42318]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[0.95rem] text-ink shadow-[inset_0_1px_1px_rgb(0_0_0/0.04)] outline-none transition placeholder:text-black/35 focus:border-plum focus:ring-[3px] focus:ring-plum/15 disabled:bg-black/[0.03]";

export function TextInput({
  label,
  help,
  error,
  optional,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode; error?: string; optional?: boolean }) {
  const id = useId();
  return (
    <Field label={label} help={help} error={error} htmlFor={id} optional={optional}>
      <input id={id} {...rest} className={cx(inputCls, "h-10", className)} aria-invalid={!!error || undefined} />
    </Field>
  );
}

export function TextArea({
  label,
  help,
  error,
  optional,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; help?: ReactNode; error?: string; optional?: boolean }) {
  const id = useId();
  return (
    <Field label={label} help={help} error={error} htmlFor={id} optional={optional}>
      <textarea id={id} rows={4} {...rest} className={cx(inputCls, "min-h-[5.5rem] leading-relaxed", className)} />
    </Field>
  );
}

export function SelectInput({
  label,
  help,
  options,
  optional,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; help?: ReactNode; options: { value: string; label: string }[]; optional?: boolean }) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} optional={optional}>
      <select id={id} {...rest} className={cx(inputCls, "h-10 pr-8")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[0.88rem] font-semibold">
          {label}
        </label>
        {help && <p className="text-[0.8rem] text-muted">{help}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-plum" : "bg-black/20")}
      >
        <span
          className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[1.375rem]" : "translate-x-0.5")}
        />
      </button>
    </div>
  );
}

// ── Layout bits ─────────────────────────────────────────────────────────────
export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.93rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.07]", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-3.5">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "plum" | "red"; children: ReactNode }) {
  const tones = {
    neutral: "bg-black/[0.06] text-ink-2",
    green: "bg-[#e3f4e8] text-[#1d6b36]",
    amber: "bg-[#fdf1d9] text-[#8a5300]",
    plum: "bg-plum-soft text-plum",
    red: "bg-[#fde7e5] text-[#b42318]",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold", tones[tone])}>{children}</span>;
}

export function StatusBadge({ status, hasChanges }: { status: string; hasChanges?: boolean }) {
  if (status === "published" && hasChanges) return <Badge tone="amber">Live · unpublished edits</Badge>;
  if (status === "published") return <Badge tone="green">● Live</Badge>;
  if (status === "archived") return <Badge>Archived</Badge>;
  return <Badge tone="plum">Draft</Badge>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-plum-soft text-plum">{icon}</div>}
      <p className="text-[1rem] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[0.9rem] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[0.9rem] text-muted" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-6xl" }[size];
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", width)}
      >
        <header className="flex items-center justify-between gap-4 border-b border-black/[0.07] px-5 py-4">
          <h2 id={titleId} className="text-[1.05rem] font-semibold">
            {title}
          </h2>
          <button type="button" data-close onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-black/5" aria-label="Close">
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-black/[0.07] bg-black/[0.015] px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

/** Confirmation dialog for destructive or important actions. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body: ReactNode; confirm: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback(
    (opts: { title: string; body: ReactNode; confirm?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => setState({ ...opts, confirm: opts.confirm ?? "Confirm", resolve })),
    [],
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const element = (
    <Dialog
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ""}
      footer={
        <>
          <Button onClick={() => close(false)}>Cancel</Button>
          <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)}>
            {state?.confirm}
          </Button>
        </>
      }
    >
      <div className="text-[0.93rem] leading-relaxed text-ink-2">{state?.body}</div>
    </Dialog>
  );
  return { ask, element };
}

// ── Toasts ──────────────────────────────────────────────────────────────────
type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 rounded-xl bg-[#1c1a1f] px-4 py-3 text-[0.9rem] text-white shadow-xl"
            style={{ animation: "fade-up .35s var(--ease-out-expo)" }}
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6fdc8c]" />
            ) : t.kind === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ff8a80]" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-saffron" />
            )}
            <p className="flex-1 leading-snug">{t.text}</p>
            <button
              type="button"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
