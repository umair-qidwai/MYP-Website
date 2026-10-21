import { ArrowUpRight, ChevronRight, Download } from "lucide-react";
import type { ButtonRef } from "@shared/blocks";
import { SmartLink, isExternal } from "./SmartLink";

type Variant = ButtonRef["style"];

const base =
  "group/btn inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[0.9375rem] font-medium tracking-[-0.01em] transition-colors duration-200";

const styles: Record<Variant, { light: string; dark: string }> = {
  primary: { light: "bg-brand text-white hover:bg-brand-deep", dark: "bg-white text-ink hover:bg-white/90" },
  secondary: { light: "bg-mist text-ink hover:bg-[#e8e8ed]", dark: "bg-white/12 text-white hover:bg-white/20" },
  link: { light: "min-h-0 px-0 text-brand hover:underline underline-offset-4", dark: "min-h-0 px-0 text-white hover:underline underline-offset-4" },
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
  const Icon = isFile ? Download : isExternal(href) ? ArrowUpRight : ChevronRight;
  return (
    <SmartLink href={href} className={`${base} ${styles[style][tone === "dark" ? "dark" : "light"]} ${className}`}>
      {label}
      <Icon aria-hidden className="size-4 opacity-80 transition-transform duration-200 group-hover/btn:translate-x-0.5" strokeWidth={2} />
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
    <div className={`flex flex-wrap items-center gap-3 ${align === "center" ? "justify-center" : ""} ${className}`}>
      {buttons.map((b, i) => (
        <Button key={`${b.href}-${i}`} href={b.href} label={b.label} style={b.style} tone={tone} />
      ))}
    </div>
  );
}
