import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import type { BlockOf, ImageRef, Tone } from "@shared/blocks";
import { RichText } from "../components/RichText";
import { Button, ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { Reveal } from "../components/Reveal";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { useSite } from "../SiteContext";
import { optionAnchor } from "../components/OnThisPage";

const dark = (t?: Tone) => t === "ink" || t === "brand";

/** Section wrapper: tinted sections get full bands; plain ones flow with modest spacing. */
export function Section({
  tone,
  children,
  className = "",
  id,
  labelledBy,
  size = "md",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  size?: "sm" | "md" | "lg";
}) {
  const banded = tone && tone !== "paper";
  const pad = banded ? "py-16 md:py-24" : size === "lg" ? "py-14 md:py-20" : size === "sm" ? "py-4 md:py-6" : "py-10 md:py-12";
  return (
    <section id={id} aria-labelledby={labelledBy} className={`tone-${tone ?? "paper"} ${pad} ${className}`}>
      {children}
    </section>
  );
}

/** Centred section heading used across blocks. */
function SectionTitle({ id, eyebrow, title, intro, onDark }: { id?: string; eyebrow?: string; title?: string; intro?: string; onDark?: boolean }) {
  if (!title && !eyebrow) return null;
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
      {eyebrow && <p className={`eyebrow mb-3 ${onDark ? "text-white/60" : "text-muted"}`}>{eyebrow}</p>}
      {title && (
        <h2 id={id} className="headline text-[clamp(1.75rem,3.4vw,2.625rem)]">
          {title}
        </h2>
      )}
      {intro && <p className={`lede mt-5 ${onDark ? "!text-white/70" : ""}`}>{intro}</p>}
    </Reveal>
  );
}

// ── Rich text ───────────────────────────────────────────────────────────────
export function RichTextBlock({ block }: { block: BlockOf<"richText"> }) {
  if (block.layout === "lead") {
    return (
      <Section tone={block.tone} size="lg">
        <Reveal className="mx-auto w-full max-w-3xl px-[var(--gutter)]">
          <RichText
            doc={block.doc}
            className={`text-center text-[clamp(1.1875rem,1rem+0.7vw,1.5rem)] font-medium leading-[1.5] tracking-[-0.02em] text-balance [&_p+p]:mt-5 ${dark(block.tone) ? "text-white" : "text-ink"}`}
          />
        </Reveal>
      </Section>
    );
  }
  return (
    <Section tone={block.tone}>
      <div className={block.layout === "wide" || block.layout === "columns" ? "wrap" : "wrap-text"}>
        <RichText doc={block.doc} className={`prose-myp ${block.layout === "columns" ? "md:columns-2 md:gap-12 [&>*]:break-inside-avoid" : ""}`} />
      </div>
    </Section>
  );
}

// ── Statement ───────────────────────────────────────────────────────────────
export function StatementBlock({ block }: { block: BlockOf<"statement"> }) {
  return (
    <Section tone={block.tone === "paper" ? "sand" : (block.tone ?? "sand")}>
      <Reveal className="wrap">
        <p className={`headline mx-auto max-w-3xl text-center text-[clamp(1.75rem,3.6vw,2.75rem)] ${dark(block.tone) ? "text-white" : "text-ink"}`}>
          {block.text}
        </p>
      </Reveal>
    </Section>
  );
}

// ── Quote ───────────────────────────────────────────────────────────────────
export function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  return (
    <Section size="lg">
      <Reveal as="div" className="wrap-text text-center">
        <figure>
          <blockquote className="headline text-[clamp(1.5rem,3vw,2.25rem)] text-ink">“{block.text}”</blockquote>
          {block.attribution && <figcaption className="mt-5 text-[0.9375rem] text-muted">{block.attribution}</figcaption>}
        </figure>
      </Reveal>
    </Section>
  );
}

// ── Image ───────────────────────────────────────────────────────────────────
export function ImageBlock({ block }: { block: BlockOf<"image"> }) {
  const portrait = (block.image.height ?? 1) > (block.image.width ?? 1) * 1.1;
  const width = block.size === "full" ? "wrap" : block.size === "wide" && !portrait ? "wrap max-w-4xl" : "wrap-text max-w-xl";
  const img = <Img image={block.image} sizes={block.size === "full" ? "100vw" : "(min-width: 1024px) 80vw, 100vw"} className="w-full rounded-[28px]" />;
  return (
    <Section>
      <Reveal as="div" className={`mx-auto ${width}`}>
        <figure>
          {block.link ? (
            <SmartLink href={block.link} className="block transition-opacity hover:opacity-90">
              {img}
            </SmartLink>
          ) : (
            img
          )}
          {block.caption && <figcaption className="mt-3 text-center text-[0.875rem] text-muted">{block.caption}</figcaption>}
        </figure>
      </Reveal>
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
          <SectionTitle title={block.heading} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {block.images.map((im, i) => {
              const tile = (
                <span className="grid aspect-[4/3] place-items-center rounded-2xl bg-mist p-6 transition-colors hover:bg-[#ececf0]">
                  <Img image={im.image} sizes="240px" className="max-h-full w-auto object-contain mix-blend-multiply" />
                </span>
              );
              return <li key={i}>{im.link ? <SmartLink href={im.link}>{tile}</SmartLink> : tile}</li>;
            })}
          </ul>
        </div>
      </Section>
    );
  }
  const cols = block.images.length === 1 ? "columns-1 max-w-3xl mx-auto" : block.images.length === 2 ? "columns-1 sm:columns-2" : "columns-2 lg:columns-3";
  return (
    <Section>
      <div className="wrap">
        <SectionTitle title={block.heading} />
        {/* Masonry columns keep every photo's real proportions — nothing is cropped */}
        <ul className={`gap-3 sm:gap-4 ${cols}`}>
          {block.images.map((im, i) => (
            <Reveal as="li" key={i} delay={(i % 3) * 0.05} className="mb-3 break-inside-avoid sm:mb-4">
              {im.link ? (
                <SmartLink href={im.link} className="group block overflow-hidden rounded-[18px] bg-mist">
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 24rem, 50vw"
                    className="w-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                  />
                </SmartLink>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group block w-full overflow-hidden rounded-[18px] bg-mist"
                  aria-label={`Open image ${i + 1} of ${block.images.length}${im.image.alt ? `: ${im.image.alt}` : ""}`}
                >
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 24rem, 50vw"
                    className="w-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                  />
                </button>
              )}
              {im.caption && <p className="mt-2 text-[0.8125rem] leading-snug text-muted">{im.caption}</p>}
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
  const btn = "grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20";
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 outline-none"
      onClick={onClose}
    >
      <img src={img.src} alt={img.alt} className="max-h-[86vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" className={`absolute right-4 top-4 ${btn}`} onClick={onClose} aria-label="Close">
        <X className="size-5" />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${btn}`}
            onClick={(e) => (e.stopPropagation(), onIndex((index - 1 + images.length) % images.length))}
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${btn}`}
            onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % images.length))}
            aria-label="Next image"
          >
            <ChevronRight className="size-5" />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[0.875rem] text-white/70" aria-live="polite">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  );
}

// ── Split (image + text) ────────────────────────────────────────────────────
export function SplitBlock({ block }: { block: BlockOf<"split">; index: number }) {
  const small = !!block.image && (block.image.width ?? 1000) < 520; // portraits / logos: compact column
  const imageLeft = block.imageSide === "left";
  const onDark = dark(block.tone);
  const hasText = block.doc.content.length > 0 || !!block.heading;
  const img = block.image && (
    <Img image={block.image} sizes={small ? "320px" : "(min-width: 768px) 50vw, 100vw"} className={`w-full ${small ? "rounded-2xl" : "rounded-[28px]"}`} />
  );
  const imageEl =
    block.image &&
    (block.imageLink ? (
      <SmartLink href={block.imageLink} className="block transition-opacity hover:opacity-90">
        {img}
      </SmartLink>
    ) : (
      img
    ));

  if (!hasText) {
    // Image + buttons only: centred showcase
    return (
      <Section tone={block.tone}>
        <Reveal className="wrap max-w-3xl text-center">
          {imageEl}
          <ButtonRow buttons={block.buttons} tone={onDark ? "dark" : undefined} align="center" className="mt-8" />
        </Reveal>
      </Section>
    );
  }
  return (
    <Section tone={block.tone}>
      <div className={`wrap grid items-center gap-8 md:gap-14 ${small ? "md:grid-cols-[12rem_1fr] lg:grid-cols-[14rem_1fr]" : "md:grid-cols-2"}`}>
        {imageEl && <Reveal className={imageLeft ? "" : "md:order-2"}>{imageEl}</Reveal>}
        <Reveal delay={0.08} className={imageLeft ? "" : "md:order-1"}>
          {block.heading && <h2 className={`headline mb-4 text-[clamp(1.5rem,2.8vw,2.25rem)] ${onDark ? "text-white" : "text-ink"}`}>{block.heading}</h2>}
          <RichText doc={block.doc} />
          <ButtonRow buttons={block.buttons} className="mt-8" tone={onDark ? "dark" : undefined} />
        </Reveal>
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
        <SectionTitle title={block.heading} intro={block.intro} onDark={dark(block.tone)} />
        <ul className={`grid gap-4 ${cols}`}>
          {block.items.map((it, i) => {
            const inner = (
              <article className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-mist">
                {it.image && block.style !== "text" && (
                  <div className={block.style === "logo" ? "grid aspect-[4/3] place-items-center p-10" : "aspect-[4/3] overflow-hidden"}>
                    <Img
                      image={it.image}
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      fit={block.style === "logo" ? "contain" : "cover"}
                      className={`transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03] ${block.style === "logo" ? "mix-blend-multiply" : ""}`}
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  {it.title && <h3 className="text-[1.1875rem] font-semibold leading-snug tracking-[-0.02em] text-ink">{it.title}</h3>}
                  {it.text && <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{it.text}</p>}
                  {it.link && (
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[0.9375rem] font-medium text-brand">
                      {it.linkLabel || "Learn more"} <ChevronRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
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
const TINTS = ["bg-mural-orange/10", "bg-mural-purple/10", "bg-mural-green/10", "bg-mural-blue/10", "bg-mural-red/10", "bg-mural-yellow/15"];

export function ProgramsBlock({ block }: { block: BlockOf<"programs"> }) {
  const { settings } = useSite();
  const items = settings.programs.items;
  if (!items.length) return null;
  const heading = block.heading || settings.programs.heading;
  return (
    <Section tone={block.tone} size="lg" labelledBy="programs-h">
      <div className="wrap">
        <SectionTitle id="programs-h" title={heading} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {items.map((p, i) => (
            <Reveal as="li" key={p.name} delay={(i % 3) * 0.06}>
              <SmartLink
                href={p.href || "/"}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.06] transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgb(40_20_70/0.3)]"
              >
                <span className={`relative block aspect-[4/3] ${TINTS[i % TINTS.length]}`}>
                  {p.image && (
                    <Img
                      image={p.image}
                      sizes="(min-width: 1024px) 22rem, 45vw"
                      className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] object-contain mix-blend-multiply sm:inset-9 sm:h-[calc(100%-4.5rem)] sm:w-[calc(100%-4.5rem)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                    />
                  )}
                </span>
                <span className="flex items-center justify-between gap-2 px-4 py-4 sm:px-5">
                  <span className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[1.0625rem]">{p.name}</span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </span>
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
    <Section size="lg">
      <Reveal className="wrap text-center">
        {block.heading && <h2 className="headline text-[clamp(1.5rem,2.8vw,2rem)]">{block.heading}</h2>}
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {settings.social.links.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2.5 rounded-full bg-mist px-5 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-[#e8e8ed]"
              >
                <SocialIcon platform={s.platform} className="size-4" />
                {SOCIAL_LABEL[s.platform]}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}

// ── Stats (only figures that exist in the content; count up once) ───────────
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const match = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(match && !reduce ? match[1] + "0" + match[3] : value);
  useEffect(() => {
    if (!match || !inView || reduce) {
      setShown(value);
      return;
    }
    const target = Number(match[2].replace(/,/g, ""));
    const decimals = match[2].includes(".") ? match[2].split(".")[1].length : 0;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(match[1] + (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + match[3]);
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

// Same colour order as the original 11-year impact card: red, purple, green, orange, blue
const STAT_TILES = ["bg-mural-red", "bg-mural-purple", "bg-mural-green", "bg-mural-orange", "bg-mural-blue"];

export function StatsBlock({ block }: { block: BlockOf<"stats"> }) {
  const groups: { name: string; items: typeof block.items }[] = [];
  for (const it of block.items) {
    const name = it.group ?? "";
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(it);
    else groups.push({ name, items: [it] });
  }
  const onDark = dark(block.tone);
  return (
    <Section tone={block.tone} labelledBy={block.heading ? `stats-${block.id}` : undefined}>
      <div className="wrap">
        <SectionTitle id={`stats-${block.id}`} eyebrow={block.eyebrow} title={block.heading} onDark={onDark} />
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, gi) => {
            const lead = gi === 0 && groups.length > 1;
            return (
              <Reveal
                key={gi}
                delay={(gi % 3) * 0.06}
                className={`rounded-[24px] p-6 text-white sm:p-7 ${STAT_TILES[gi % STAT_TILES.length]} ${lead ? "md:col-span-2" : ""}`}
              >
                <dl className={`grid gap-x-6 gap-y-5 ${lead ? "grid-cols-1 sm:grid-cols-2 sm:py-4" : "grid-cols-2"}`}>
                  {g.items.map((s, i) => (
                    <div key={i} className="flex flex-col">
                      <dd
                        className={`order-1 font-semibold leading-none tracking-[-0.04em] ${lead ? "text-[clamp(3rem,7vw,5.25rem)]" : "text-[clamp(1.75rem,3vw,2.25rem)]"}`}
                      >
                        <CountUp value={s.value} />
                      </dd>
                      <dt className={`order-2 mt-2 leading-snug text-white/85 ${lead ? "text-[1.0625rem]" : "text-[0.875rem]"}`}>{s.label}</dt>
                      {s.note && <dd className="order-3 mt-1 text-[0.75rem] leading-snug text-white/70">{s.note}</dd>}
                    </div>
                  ))}
                </dl>
              </Reveal>
            );
          })}
        </div>
        {block.source && (
          <p className={`mt-8 text-center text-[0.8125rem] ${onDark ? "text-white/55" : "text-muted"}`}>
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
      <div className="wrap-text">
        {block.heading && <h2 className="headline mb-8 text-[clamp(1.75rem,3.5vw,2.5rem)]">{block.heading}</h2>}
        <div className="border-t border-hairline">
          {block.items.map((it, i) => (
            <details key={i} className="group border-b border-hairline [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[1.0625rem] font-medium text-ink">
                {it.title}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="pb-6">
                <RichText doc={it.doc} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Call to action ──────────────────────────────────────────────────────────
export function CtaBlock({ block }: { block: BlockOf<"cta"> }) {
  const tone = block.tone ?? "brand";
  const onDark = dark(tone);
  return (
    <section className="px-3 py-6 sm:px-4">
      <Reveal className={`tone-${tone === "paper" ? "sand" : tone} mx-auto max-w-6xl rounded-[28px] px-6 py-14 text-center md:py-20`}>
        <h2 className={`headline mx-auto max-w-2xl text-[clamp(1.75rem,3.6vw,2.75rem)] ${onDark ? "text-white" : "text-ink"}`}>{block.heading}</h2>
        {block.text && <p className={`lede mx-auto mt-5 max-w-xl ${onDark ? "!text-white/75" : ""}`}>{block.text}</p>}
        <ButtonRow
          buttons={block.buttons.map((b, i) => (i === 0 ? { ...b, style: "primary" } : b))}
          tone={onDark ? "dark" : undefined}
          align="center"
          className="mt-9"
        />
      </Reveal>
    </section>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────────
export function TimelineBlock({ block }: { block: BlockOf<"timeline"> }) {
  return (
    <Section>
      <div className="wrap-text">
        {block.heading && <h2 className="headline mb-10 text-[clamp(1.75rem,3.5vw,2.5rem)]">{block.heading}</h2>}
        <ol className="space-y-8 border-s border-hairline ps-8">
          {block.items.map((it, i) => (
            <Reveal as="li" key={i} className="relative">
              <span aria-hidden className="absolute -start-[2.33rem] top-2 size-2.5 rounded-full bg-brand" />
              <p className="text-[0.875rem] font-medium text-brand">{it.date}</p>
              <h3 className="mt-1 text-[1.1875rem] font-semibold tracking-[-0.02em]">{it.title}</h3>
              {it.text && <p className="mt-1.5 text-ink-2">{it.text}</p>}
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}

// ── Downloads ───────────────────────────────────────────────────────────────
export const fmtSize = (n?: number) => (!n ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function DownloadsBlock({ block }: { block: BlockOf<"downloads"> }) {
  return (
    <Section>
      <div className="wrap-text">
        {block.heading && <h2 className="headline mb-8 text-[clamp(1.75rem,3.5vw,2.5rem)]">{block.heading}</h2>}
        <ul className="divide-y divide-hairline border-y border-hairline">
          {block.items.map((it, i) => {
            const href = it.file?.url ?? it.url;
            return (
              <li key={i} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
                  <div>
                    <p className="font-medium text-ink">{it.title}</p>
                    {it.description && <p className="text-[0.9375rem] text-muted">{it.description}</p>}
                  </div>
                </div>
                {href && <Button href={href} label={`Download${it.file?.size ? ` · ${fmtSize(it.file.size)}` : ""}`} style="secondary" />}
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────
export function ButtonsBlock({ block }: { block: BlockOf<"buttons"> }) {
  return (
    <Section size="sm">
      <div className={block.align === "center" ? "wrap" : "wrap-text"}>
        <ButtonRow buttons={block.buttons} align={block.align} />
      </div>
    </Section>
  );
}

// ── Video ───────────────────────────────────────────────────────────────────
export function VideoBlock({ block }: { block: BlockOf<"video"> }) {
  return (
    <Section>
      <div className="wrap">
        <SectionTitle title={block.heading} />
        <div className={`mx-auto grid max-w-4xl gap-4 ${block.videos.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {block.videos.map((v, i) => (
            <figure key={i}>
              <video controls preload="metadata" playsInline src={v.file.url} className="w-full rounded-[24px] bg-black" />
              {v.caption && <figcaption className="mt-2 text-[0.875rem] text-muted">{v.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Options (ways to give, volunteer roles, departments…) ──────────────────
function ClampedText({ doc, onDark }: { doc: BlockOf<"options">["items"][number]["doc"]; onDark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 4);
  }, [doc]);
  if (!doc?.content.length) return null;
  return (
    <div className="mt-3">
      <div ref={ref} className={`relative ${open ? "" : "max-h-[9.5rem] overflow-hidden"}`}>
        <RichText doc={doc} className="prose-myp !text-[0.9375rem] !leading-relaxed [&_:is(h2,h3,h4)]:!mt-5 [&_:is(h2,h3,h4)]:!text-[1rem]" />
        {!open && overflows && <div aria-hidden className={`absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${onDark ? "from-black" : "from-mist"}`} />}
      </div>
      {overflows && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-[0.875rem] font-medium text-brand hover:underline">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function OptionsBlock({ block }: { block: BlockOf<"options"> }) {
  const onDark = dark(block.tone);
  return (
    <Section tone={block.tone}>
      <div className="wrap">
        <SectionTitle title={block.heading} intro={block.intro} onDark={onDark} />
        <ul className="flex flex-wrap justify-center gap-4">
          {block.items.map((it, i) => (
            <Reveal
              as="li"
              key={i}
              delay={(i % block.columns) * 0.06}
              className={`w-full ${block.columns === 3 ? "sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]" : "md:w-[calc(50%-0.5rem)]"}`}
            >
              <article
                id={optionAnchor(block.id, i)}
                className={`flex h-full flex-col overflow-hidden rounded-[24px] ${onDark ? "bg-white/[0.06]" : "bg-mist"}`}
              >
                {it.image && (
                  <div className="flex justify-center px-4 pt-4 sm:px-5 sm:pt-5">
                    {it.imageLink ? (
                      <SmartLink
                        href={it.imageLink}
                        className="block transition-opacity hover:opacity-90"
                        aria-label={it.title ? undefined : it.buttons[0]?.label}
                      >
                        <Img image={it.image} sizes="(min-width: 768px) 36rem, 100vw" className="h-auto max-h-72 w-auto rounded-2xl object-contain" />
                      </SmartLink>
                    ) : (
                      <Img image={it.image} sizes="(min-width: 768px) 36rem, 100vw" className="h-auto max-h-72 w-auto rounded-2xl object-contain" />
                    )}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  {it.eyebrow && <p className={`eyebrow mb-1.5 ${onDark ? "text-white/60" : "text-brand"}`}>{it.eyebrow}</p>}
                  {it.title && (
                    <h3 className={`text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] ${onDark ? "text-white" : "text-ink"}`}>{it.title}</h3>
                  )}
                  <ClampedText doc={it.doc} onDark={onDark} />
                  {it.buttons.length > 0 && (
                    <div className={it.doc?.content.length || it.image ? "mt-auto pt-6" : "mt-3"}>
                      <ButtonRow
                        buttons={it.buttons.map((b, k) => ({ ...b, style: b.style === "link" || k > 0 ? "link" : "primary" }))}
                        tone={onDark ? "dark" : undefined}
                      />
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
