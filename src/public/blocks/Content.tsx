import { useEffect, useRef, useState, type ReactNode } from "react";
import { m, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, HeartHandshake, HeartPulse, Landmark, Plus, ShoppingBasket, Users, X } from "lucide-react";
import type { BlockOf, ImageRef, Tone } from "@shared/blocks";
import { RichText, headingsOf } from "../components/RichText";
import { Button, ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { MaskLines, MosaicBars, Reveal } from "../components/Reveal";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { useSite } from "../SiteContext";

const toneClass = (t?: Tone) => `tone-${t ?? "paper"}`;
const dark = (t?: Tone) => t === "ink" || t === "brand";

/** Vertical rhythm: blocks on the same tone sit closer; tone changes get full-bleed bands. */
export function Section({
  tone,
  children,
  className = "",
  id,
  labelledBy,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const banded = tone && tone !== "paper";
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${toneClass(tone)} ${banded ? "py-20 md:py-28" : "py-10 md:py-14"} ${className}`}>
      {children}
    </section>
  );
}

// ── Rich text ───────────────────────────────────────────────────────────────
export function RichTextBlock({ block }: { block: BlockOf<"richText"> }) {
  if (block.layout === "lead") {
    return (
      <Section tone={block.tone}>
        <div className="wrap grid md:grid-cols-12">
          <Reveal className="md:col-span-10 md:col-start-2 lg:col-span-9 lg:col-start-3">
            <RichText doc={block.doc} className="prose-myp prose-lead !max-w-[46ch] text-pretty" />
          </Reveal>
        </div>
      </Section>
    );
  }
  const toc = block.layout === "default" ? headingsOf(block.doc).filter((h) => h.level <= 3) : [];
  if (toc.length >= 4) {
    // Long documents get a sticky "On this page" rail on wide screens
    return (
      <Section tone={block.tone}>
        <div className="wrap grid gap-10 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block" aria-label="On this page">
            <nav className="sticky top-[calc(var(--header-h)+2rem)]">
              <p className="eyebrow mb-4 text-muted">On this page</p>
              <ol className="space-y-1 border-s border-line">
                {toc.map((h, i) => (
                  <li key={`${h.id}-${i}`}>
                    <a
                      href={`#${h.id}`}
                      className={`-ms-px block border-s-2 border-transparent py-1.5 ps-4 text-[0.92rem] leading-snug text-ink-2 transition-colors hover:border-plum hover:text-ink ${h.level === 3 ? "ps-6 text-[0.86rem]" : ""}`}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            <RichText doc={block.doc} />
          </div>
        </div>
      </Section>
    );
  }
  return (
    <Section tone={block.tone}>
      <div className="wrap grid md:grid-cols-12">
        <div className={block.layout === "wide" ? "md:col-span-12" : "md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3"}>
          <RichText
            doc={block.doc}
            className={`prose-myp ${block.layout === "wide" ? "!max-w-none" : ""} ${block.layout === "columns" ? "!max-w-none md:columns-2 md:gap-12 [&>*]:break-inside-avoid" : ""}`}
          />
        </div>
      </div>
    </Section>
  );
}

// ── Statement ───────────────────────────────────────────────────────────────
export function StatementBlock({ block }: { block: BlockOf<"statement"> }) {
  const sentences = block.text.split(/(?<=[.!?])\s+/);
  const last = sentences.length > 1 ? sentences.pop()! : null;
  return (
    <Section tone={block.tone} className="grain overflow-hidden">
      <div className="wrap">
        <MosaicBars className="mb-10 w-24 overflow-hidden rounded-full" />
        <p className="display max-w-[16ch] text-[clamp(2.6rem,7.5vw,7rem)]">
          <MaskLines lines={[sentences.join(" "), ...(last ? [<span className="serif-accent text-plum">{last}</span>] : [])]} />
        </p>
      </div>
    </Section>
  );
}

// ── Quote ───────────────────────────────────────────────────────────────────
export function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  return (
    <Section>
      <figure className="wrap-narrow">
        <Reveal>
          <blockquote className="font-serif text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.15] tracking-[-0.01em]">
            <span aria-hidden className="mr-1 text-plum">
              “
            </span>
            {block.text}
            <span aria-hidden className="text-plum">
              ”
            </span>
          </blockquote>
          {block.attribution && <figcaption className="eyebrow mt-6 text-muted">— {block.attribution}</figcaption>}
        </Reveal>
      </figure>
    </Section>
  );
}

// ── Image ───────────────────────────────────────────────────────────────────
function ClipReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return (
    <div
      ref={ref}
      className={className}
      style={
        reduce
          ? undefined
          : { clipPath: inView ? "inset(0 0 0 0 round 24px)" : "inset(12% 8% 12% 8% round 24px)", transition: "clip-path 1.3s cubic-bezier(.16,1,.3,1)" }
      }
    >
      {children}
    </div>
  );
}

export function ImageBlock({ block }: { block: BlockOf<"image"> }) {
  const portrait = (block.image.height ?? 1) > (block.image.width ?? 1) * 1.1;
  const span = block.size === "full" ? "md:col-span-12" : block.size === "wide" && !portrait ? "md:col-span-10 md:col-start-2" : "md:col-span-6 md:col-start-4";
  const img = <Img image={block.image} sizes={block.size === "full" ? "100vw" : "(min-width: 768px) 70vw, 100vw"} className="w-full rounded-[22px]" />;
  return (
    <Section>
      <figure className="wrap grid md:grid-cols-12">
        <div className={span}>
          <ClipReveal>
            {block.link ? (
              <SmartLink href={block.link} className="block transition-transform duration-700 hover:scale-[1.01]">
                {img}
              </SmartLink>
            ) : (
              img
            )}
          </ClipReveal>
          {block.caption && <figcaption className="mt-3 text-sm text-muted">{block.caption}</figcaption>}
        </div>
      </figure>
    </Section>
  );
}

// ── Gallery with lightbox ───────────────────────────────────────────────────
export function GalleryBlock({ block }: { block: BlockOf<"gallery"> }) {
  const [open, setOpen] = useState<number | null>(null);
  if (block.layout === "logos") {
    return (
      <Section>
        <div className="wrap">
          {block.heading && <h2 className="display mb-8 text-[clamp(1.8rem,3vw,2.6rem)]">{block.heading}</h2>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {block.images.map((im, i) => {
              const tile = (
                <span className="grid aspect-[4/3] place-items-center rounded-2xl bg-white p-5 ring-1 ring-ink/5 transition-transform duration-500 hover:-translate-y-1">
                  <Img image={im.image} sizes="240px" className="max-h-full w-auto object-contain" />
                </span>
              );
              return <li key={i}>{im.link ? <SmartLink href={im.link}>{tile}</SmartLink> : tile}</li>;
            })}
          </ul>
        </div>
      </Section>
    );
  }
  return (
    <Section>
      <div className="wrap">
        {block.heading && <h2 className="display mb-8 text-[clamp(1.8rem,3vw,2.6rem)]">{block.heading}</h2>}
        <ul
          className={`grid gap-3 md:gap-4 ${block.images.length === 2 ? "sm:grid-cols-2" : block.images.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}
        >
          {block.images.map((im, i) => (
            <Reveal as="li" key={i} delay={(i % 4) * 0.05}>
              {im.link ? (
                <SmartLink href={im.link} className="group block overflow-hidden rounded-2xl bg-paper-2">
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    fit="cover"
                    className="aspect-[4/3] transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </SmartLink>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group block w-full overflow-hidden rounded-2xl bg-paper-2"
                  aria-label={`Open image ${i + 1} of ${block.images.length}${im.image.alt ? `: ${im.image.alt}` : ""}`}
                >
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    fit="cover"
                    className="aspect-[4/3] transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </button>
              )}
              {im.caption && <p className="mt-2 text-sm leading-snug text-muted">{im.caption}</p>}
            </Reveal>
          ))}
        </ul>
      </div>
      {open !== null && <Lightbox images={block.images.map((x) => x.image)} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </Section>
  );
}

function Lightbox({ images, index, onClose, onIndex }: { images: ImageRef[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      prev?.focus();
    };
  }, [index, images.length, onClose, onIndex]);
  const img = images[index];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4 outline-none"
      onClick={onClose}
    >
      <img src={img.src} alt={img.alt} className="max-h-[86vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      <button
        type="button"
        className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-paper text-ink"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-5" />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink"
            onClick={(e) => (e.stopPropagation(), onIndex((index - 1 + images.length) % images.length))}
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink"
            onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % images.length))}
            aria-label="Next image"
          >
            <ChevronRight className="size-5" />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-paper/70" aria-live="polite">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  );
}

// ── Split (image + text) ────────────────────────────────────────────────────
export function SplitBlock({ block, index }: { block: BlockOf<"split">; index: number }) {
  const small = !!block.image && (block.image.width ?? 1000) < 520; // portraits / logos: compact column
  const imageLeft = block.imageSide === "left";
  const tone = block.tone;
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce || small ? ["0%", "0%"] : ["-5%", "5%"]);
  const hasText = block.doc.content.length > 0 || !!block.heading;
  const img = block.image && (
    <div ref={ref} className={`overflow-hidden ${small ? "rounded-2xl" : "rounded-[26px]"} ${small ? "bg-white" : "bg-paper-2"}`}>
      <m.div style={{ y }} className={small ? "" : "scale-[1.08]"}>
        <Img image={block.image} sizes={small ? "320px" : "(min-width: 768px) 50vw, 100vw"} className="w-full" />
      </m.div>
    </div>
  );
  const imageEl =
    block.image &&
    (block.imageLink ? (
      <SmartLink href={block.imageLink} className="block transition-transform duration-700 hover:-translate-y-1">
        {img}
      </SmartLink>
    ) : (
      img
    ));
  return (
    <Section tone={tone}>
      <div className={`wrap grid items-center gap-8 md:grid-cols-12 md:gap-12 ${index === 0 ? "" : ""}`}>
        {imageEl && (
          <Reveal
            className={`${small ? "md:col-span-4 lg:col-span-3" : hasText ? "md:col-span-6" : "md:col-span-8 md:col-start-3"} ${imageLeft || !hasText ? "" : "md:order-2"} ${small && !imageLeft ? "md:col-start-9" : ""}`}
          >
            {imageEl}
          </Reveal>
        )}
        {(hasText || block.buttons.length > 0) && (
          <Reveal
            delay={0.08}
            className={`${!hasText ? "md:col-span-8 md:col-start-3" : imageEl ? (small ? "md:col-span-8 lg:col-span-8" : "md:col-span-6") : "md:col-span-8 md:col-start-3"} ${imageLeft || !hasText ? "" : "md:order-1"}`}
          >
            {block.heading && <h2 className="display mb-6 text-[clamp(2rem,4.2vw,3.6rem)]">{block.heading}</h2>}
            <RichText doc={block.doc} />
            <ButtonRow buttons={block.buttons} className="mt-8" tone={dark(tone) ? "dark" : undefined} />
          </Reveal>
        )}
      </div>
    </Section>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────
export function CardsBlock({ block }: { block: BlockOf<"cards"> }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[block.columns];
  return (
    <Section tone={block.tone}>
      <div className="wrap">
        {(block.heading || block.intro) && (
          <div className="mb-12 max-w-3xl">
            {block.heading && <h2 className="display text-[clamp(2rem,4vw,3.4rem)]">{block.heading}</h2>}
            {block.intro && <p className="mt-4 text-lg text-muted">{block.intro}</p>}
          </div>
        )}
        <ul className={`grid gap-4 md:gap-6 ${cols}`}>
          {block.items.map((it, i) => {
            const inner = (
              <article
                className={`group flex h-full flex-col overflow-hidden rounded-[22px] ${block.style === "text" ? "bg-paper-2 p-7" : "bg-white ring-1 ring-ink/5"} transition-transform duration-500 hover:-translate-y-1`}
              >
                {it.image && block.style !== "text" && (
                  <div className={block.style === "logo" ? "grid aspect-square place-items-center p-8" : "aspect-[4/3] overflow-hidden"}>
                    <Img
                      image={it.image}
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      fit={block.style === "logo" ? "contain" : "cover"}
                      className="transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className={block.style === "text" ? "" : "flex flex-1 flex-col p-6"}>
                  {it.title && <h3 className="display text-[1.5rem] font-semibold leading-tight">{it.title}</h3>}
                  {it.text && <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">{it.text}</p>}
                  {it.link && (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-plum">
                      {it.linkLabel || "Learn more"}{" "}
                      <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </div>
              </article>
            );
            return (
              <Reveal as="li" key={i} delay={(i % 3) * 0.06}>
                {it.link ? (
                  <SmartLink href={it.link} className="block h-full">
                    {inner}
                  </SmartLink>
                ) : (
                  inner
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ── Programs (site-wide initiatives) ────────────────────────────────────────
export function ProgramsBlock({ block }: { block: BlockOf<"programs"> }) {
  const { settings } = useSite();
  const items = settings.programs.items;
  if (!items.length) return null;
  const heading = block.heading || settings.programs.heading;
  return (
    <Section tone={block.tone} className="overflow-hidden" labelledBy="programs-h">
      <div className="wrap grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <MosaicBars className="mb-8 w-24 overflow-hidden rounded-full" />
            {heading && (
              <h2 id="programs-h" className="display text-[clamp(2.4rem,4.6vw,4.2rem)]">
                <MaskLines lines={[heading]} />
              </h2>
            )}
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-8 lg:grid-cols-3">
          {items.map((p, i) => (
            <Reveal as="li" key={p.name} delay={(i % 3) * 0.07} className={i % 3 === 1 ? "lg:translate-y-12" : ""}>
              <SmartLink
                href={p.href || "/"}
                className="group relative flex h-full flex-col overflow-hidden rounded-[24px] bg-white p-3 ring-1 ring-ink/5 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgb(79_45_130/0.45)]"
              >
                <div className="grid aspect-square place-items-center overflow-hidden rounded-[18px] bg-white">
                  {p.image ? (
                    <Img
                      image={p.image}
                      sizes="(min-width: 1024px) 22vw, 45vw"
                      className="h-[88%] w-[88%] object-contain transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-3">
                  <span className="text-[0.95rem] font-semibold leading-tight sm:text-base">{p.name}</span>
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-paper transition-colors group-hover:bg-plum group-hover:text-white"
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </SmartLink>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ── Social ──────────────────────────────────────────────────────────────────
export function SocialBlock({ block }: { block: BlockOf<"social"> }) {
  const { settings } = useSite();
  return (
    <Section>
      <div className="wrap flex flex-col gap-8 border-t border-line pt-12 md:flex-row md:items-end md:justify-between">
        {block.heading && <h2 className="display text-[clamp(2.2rem,5vw,4.5rem)]">{block.heading}</h2>}
        <ul className="flex flex-wrap gap-3">
          {settings.social.links.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-full py-2 pl-2 pr-5 ring-1 ring-ink/15 transition-colors hover:bg-ink hover:text-paper"
              >
                <span className="grid size-10 place-items-center rounded-full bg-ink text-paper transition-colors group-hover:bg-saffron group-hover:text-ink">
                  <SocialIcon platform={s.platform} className="size-[1.1rem]" />
                </span>
                <span className="text-sm font-semibold">{SOCIAL_LABEL[s.platform]}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ── Stats (only figures that exist in the content; animated count-up) ───────
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const m = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(m && !reduce ? m[1] + "0" + m[3] : value);
  useEffect(() => {
    if (!m || !inView || reduce) {
      setShown(value);
      return;
    }
    const target = Number(m[2].replace(/,/g, ""));
    const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - p, 4);
      const n = (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      setShown(m[1] + n + m[3]);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce]);
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

const GROUP_STYLE = [
  { bar: "bg-terracotta", icon: HeartHandshake },
  { bar: "bg-plum", icon: ShoppingBasket },
  { bar: "bg-leaf", icon: Users },
  { bar: "bg-saffron", icon: HeartPulse },
  { bar: "bg-sky", icon: Landmark },
];

export function StatsBlock({ block }: { block: BlockOf<"stats"> }) {
  const isDark = dark(block.tone);
  const groups: { key: string; items: BlockOf<"stats">["items"] }[] = [];
  for (const it of block.items) {
    const key = it.group ?? "";
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(it);
    else groups.push({ key, items: [it] });
  }
  return (
    <Section tone={block.tone} className="overflow-hidden" labelledBy={block.heading ? `stats-${block.id}` : undefined}>
      <div className="wrap">
        <div className="mb-14 grid gap-6 md:mb-20 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            {block.eyebrow && <p className={`eyebrow mb-5 ${isDark ? "text-saffron" : "text-plum"}`}>{block.eyebrow}</p>}
            {block.heading && (
              <h2 id={`stats-${block.id}`} className="display text-[clamp(2.4rem,5.5vw,5.2rem)]">
                <MaskLines lines={[block.heading]} />
              </h2>
            )}
          </div>
          <MosaicBars className="w-32 overflow-hidden rounded-full md:col-span-4 md:justify-self-end" />
        </div>
        <div className={`divide-y ${isDark ? "divide-white/10 border-white/10" : "divide-line border-line"} border-y`}>
          {groups.map((g, gi) => {
            const style = GROUP_STYLE[gi % GROUP_STYLE.length];
            const Icon = style.icon;
            return (
              <Reveal key={gi} className="relative grid gap-y-8 py-10 md:grid-cols-12 md:py-12">
                <div className="flex items-center gap-4 md:col-span-2 md:flex-col md:items-start">
                  <span aria-hidden className={`block h-1.5 w-12 rounded-full ${style.bar}`} />
                  <Icon aria-hidden className={`size-7 ${isDark ? "text-paper/60" : "text-muted"}`} strokeWidth={1.5} />
                </div>
                <dl
                  className={`grid grid-cols-2 gap-x-6 gap-y-8 md:col-span-10 ${g.items.length >= 4 ? "lg:grid-cols-4" : g.items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
                >
                  {g.items.map((s, i) => (
                    <div key={i} className="flex flex-col">
                      <dd
                        className={`display order-1 ${g.items.length <= 2 ? "text-[clamp(3rem,8vw,7rem)]" : "text-[clamp(2.4rem,5vw,4.4rem)]"} leading-[0.9]`}
                      >
                        <CountUp value={s.value} />
                      </dd>
                      <dt className={`order-2 mt-3 max-w-[22ch] text-[0.98rem] leading-snug ${isDark ? "text-paper/75" : "text-ink-2"}`}>{s.label}</dt>
                      {s.note && <dd className={`order-3 mt-2 max-w-[28ch] text-sm leading-snug ${isDark ? "text-paper/55" : "text-muted"}`}>{s.note}</dd>}
                    </div>
                  ))}
                </dl>
              </Reveal>
            );
          })}
        </div>
        {block.source && (
          <p className={`mt-8 text-sm ${isDark ? "text-paper/55" : "text-muted"}`}>
            {block.source}{" "}
            {block.sourceLink && (
              <SmartLink href={block.sourceLink} className="underline underline-offset-4 hover:text-current">
                View reports
              </SmartLink>
            )}
          </p>
        )}
      </div>
    </Section>
  );
}

// ── Accordion ───────────────────────────────────────────────────────────────
export function AccordionBlock({ block }: { block: BlockOf<"accordion"> }) {
  return (
    <Section>
      <div className="wrap grid md:grid-cols-12">
        <div className="md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3">
          {block.heading && <h2 className="display mb-8 text-[clamp(2rem,4vw,3rem)]">{block.heading}</h2>}
          <div className="divide-y divide-line border-y border-line">
            {block.items.map((it, i) => (
              <details key={i} className="group py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[1.12rem] font-semibold leading-snug hover:text-plum">
                  {it.title}
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-ink/15 transition-transform duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-paper"
                  >
                    <Plus className="size-4" />
                  </span>
                </summary>
                <div className="pb-6 pr-12">
                  <RichText doc={it.doc} />
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Call to action ──────────────────────────────────────────────────────────
export function CtaBlock({ block }: { block: BlockOf<"cta"> }) {
  const tone = block.tone ?? "brand";
  return (
    <section className="px-[calc(var(--gutter)*0.5)] py-6">
      <div className={`${toneClass(tone)} grain relative overflow-hidden rounded-[32px] px-[var(--gutter)] py-16 md:py-24`}>
        <div aria-hidden className="pointer-events-none absolute -right-10 bottom-0 flex h-[80%] items-end gap-3 opacity-90 max-md:hidden">
          {["bg-terracotta", "bg-saffron", "bg-leaf", "bg-teal", "bg-sky", "bg-rose"].map((c, i) => (
            <m.span
              key={c}
              className={`${c} block w-10 rounded-t-xl`}
              initial={{ height: "8%" }}
              whileInView={{ height: `${[38, 62, 84, 70, 52, 30][i]}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="relative max-w-3xl">
          <h2 className="display text-[clamp(2.4rem,6vw,5.6rem)]">
            <MaskLines lines={[block.heading]} />
          </h2>
          {block.text && <p className="mt-6 max-w-xl text-lg opacity-85">{block.text}</p>}
          <ButtonRow
            buttons={block.buttons.map((b, i) => (i === 0 ? { ...b, style: "primary" } : b))}
            tone={dark(tone) ? "dark" : undefined}
            className="mt-10"
          />
        </div>
      </div>
    </section>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────────
export function TimelineBlock({ block }: { block: BlockOf<"timeline"> }) {
  return (
    <Section>
      <div className="wrap grid md:grid-cols-12">
        <div className="md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3">
          {block.heading && <h2 className="display mb-10 text-[clamp(2rem,4vw,3rem)]">{block.heading}</h2>}
          <ol className="relative border-s-2 border-line">
            {block.items.map((it, i) => (
              <Reveal as="li" key={i} className="relative pb-10 ps-8 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -start-[9px] top-1.5 size-4 rounded-sm bg-plum ring-4 ring-paper"
                  style={{ transform: "rotate(45deg)" }}
                />
                <p className="eyebrow text-plum">{it.date}</p>
                <h3 className="mt-2 text-xl font-semibold">{it.title}</h3>
                {it.text && <p className="mt-2 text-ink-2">{it.text}</p>}
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

// ── Downloads ───────────────────────────────────────────────────────────────
export const fmtSize = (n?: number) => (!n ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function DownloadsBlock({ block }: { block: BlockOf<"downloads"> }) {
  return (
    <Section>
      <div className="wrap grid md:grid-cols-12">
        <div className="md:col-span-10 md:col-start-2">
          {block.heading && <h2 className="display mb-8 text-[clamp(2rem,4vw,3rem)]">{block.heading}</h2>}
          <ul className="divide-y divide-line border-y border-line">
            {block.items.map((it, i) => {
              const href = it.file?.url ?? it.url;
              return (
                <li key={i} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <FileText aria-hidden className="mt-1 size-5 shrink-0 text-plum" />
                    <div>
                      <p className="font-semibold">{it.title}</p>
                      {it.description && <p className="text-sm text-muted">{it.description}</p>}
                    </div>
                  </div>
                  {href && <Button href={href} label={`Download${it.file?.size ? ` (${fmtSize(it.file.size)})` : ""}`} style="secondary" />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────
export function ButtonsBlock({ block }: { block: BlockOf<"buttons"> }) {
  return (
    <section className="py-4">
      <div className="wrap grid md:grid-cols-12">
        <div className={block.align === "center" ? "md:col-span-12" : "md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3"}>
          <ButtonRow buttons={block.buttons} align={block.align} />
        </div>
      </div>
    </section>
  );
}

// ── Video ───────────────────────────────────────────────────────────────────
export function VideoBlock({ block }: { block: BlockOf<"video"> }) {
  return (
    <Section>
      <div className="wrap">
        {block.heading && <h2 className="display mb-8 text-[clamp(2rem,4vw,3rem)]">{block.heading}</h2>}
        <div className={`grid gap-4 ${block.videos.length > 1 ? "sm:grid-cols-2" : "md:grid-cols-12"}`}>
          {block.videos.map((v, i) => (
            <figure key={i} className={block.videos.length > 1 ? "" : "md:col-span-10 md:col-start-2"}>
              <video controls preload="metadata" playsInline src={v.file.url} className="w-full rounded-[20px] bg-ink" />
              {v.caption && <figcaption className="mt-2 text-sm text-muted">{v.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </Section>
  );
}
