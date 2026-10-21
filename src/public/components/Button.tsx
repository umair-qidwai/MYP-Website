import { ArrowUpRight, ArrowRight, Download } from "lucide-react";
import type { ButtonRef } from "@shared/blocks";
import { SmartLink, isExternal } from "./SmartLink";

type Variant = ButtonRef["style"] | "light" | "saffron";

const base =
  "group/btn relative inline-flex min-h-12 items-center gap-3 rounded-full px-6 py-3 text-[0.95rem] font-semibold leading-tight tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-plum shadow-[0_1px_0_rgb(255_255_255/0.15)_inset]",
  secondary: "bg-transparent text-ink ring-1 ring-ink/25 ring-inset hover:ring-ink hover:bg-ink/[0.04]",
  link: "min-h-0 px-0 py-1 rounded-none text-ink underline decoration-ink/30 underline-offset-[0.35em] hover:decoration-ink",
  light: "bg-paper text-ink hover:bg-white",
  saffron: "bg-saffron text-ink hover:bg-[#f2b85c]",
};

export function Button({
  href,
  label,
  style = "primary",
  className = "",
  tone,
}: {
  href: string;
  label: string;
  style?: Variant;
  className?: string;
  tone?: "dark";
}) {
  const isFile = href.startsWith("/media/") && /\.pdf$/i.test(href);
  const Icon = isFile ? Download : isExternal(href) ? ArrowUpRight : ArrowRight;
  let v = variants[style];
  if (tone === "dark" && style === "primary") v = variants.saffron;
  if (tone === "dark" && style === "secondary") v = "bg-transparent text-current ring-1 ring-current/40 ring-inset hover:ring-current hover:bg-white/5";
  if (tone === "dark" && style === "link")
    v = variants.link.replace(/text-ink|decoration-ink\/30|hover:decoration-ink/g, "") + " text-current decoration-current/40";
  return (
    <SmartLink href={href} className={`${base} ${v} ${className}`}>
      <span>{label}</span>
      {style !== "link" && (
        <span aria-hidden className="relative grid size-5 place-items-center overflow-hidden">
          <Icon
            className="size-[1.05rem] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-px"
            strokeWidth={2.2}
          />
        </span>
      )}
    </SmartLink>
  );
}

export function ButtonRow({
  buttons,
  tone,
  align = "start",
  className = "",
}: {
  buttons: ButtonRef[];
  tone?: "dark";
  align?: "start" | "center";
  className?: string;
}) {
  if (!buttons.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""} ${className}`}>
      {buttons.map((b, i) => (
        <Button key={`${b.href}-${i}`} href={b.href} label={b.label} style={b.style} tone={tone} />
      ))}
    </div>
  );
}
