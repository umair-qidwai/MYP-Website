import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import type { BlockOf, ImageRef, Tone } from "@shared/blocks";
import { RichText, headingsOf } from "../components/RichText";
import { Button, ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { Reveal } from "../components/Reveal";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { useSite } from "../SiteContext";

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
  const pad = banded ? "py-20 md:py-28" : size === "lg" ? "py-20 md:py-28" : size === "sm" ? "py-6 md:py-8" : "py-12 md:py-16";
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
    <Reveal className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
      {eyebrow && <p className={`eyebrow mb-3 ${onDark ? "text-white/60" : "text-muted"}`}>{eyebrow}</p>}
      {title && (
        <h2 id={id} className="headline text-[clamp(2rem,4.5vw,3.5rem)]">
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
            className={`text-[clamp(1.25rem,1rem+0.9vw,1.625rem)] font-medium leading-[1.5] tracking-[-0.02em] text-pretty [&_p+p]:mt-6 ${dark(block.tone) ? "text-white" : "text-ink"}`}
          />
        </Reveal>
      </Section>
    );
  }
  const toc = block.layout === "default" ? headingsOf(block.doc).filter((h) => h.level <= 3) : [];
  if (toc.length >= 5) {
    return (
      <Section tone={block.tone}>
        <div className="wrap grid gap-12 lg:grid-cols-[14rem_minmax(0,46rem)] lg:justify-center lg:gap-16">
          <aside className="hidden lg:block" aria-label="On this page">
            <nav className="sticky top-28">
              <p className="mb-3 text-[0.8125rem] font-semibold text-ink">On this page</p>
              <ol className="space-y-2 text-[0.875rem]">
                {toc.map((h, i) => (
                  <li key={`${h.id}-${i}`} className={h.level === 3 ? "pl-3" : ""}>
                    <a href={`#${h.id}`} className="text-muted transition-colors hover:text-ink">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <RichText doc={block.doc} />
        </div>
      </Section>
    );
  }
  return (
    <Section tone={block.tone}>
      <div className={block.layout === "wide" ? "wrap" : "wrap-text"}>
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
        <p className={`headline mx-auto max-w-4xl text-center text-[clamp(2rem,5vw,4rem)] ${dark(block.tone) ? "text-white" : "text-ink"}`}>{block.text}</p>
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
  const width = block.size === "full" ? "max-w-[90rem] px-3 sm:px-4" : block.size === "wide" && !portrait ? "wrap" : "wrap-text";
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
  const cols =
    block.images.length === 1 ? "" : block.images.length === 2 ? "sm:grid-cols-2" : block.images.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-3";
  return (
    <Section>
      <div className="wrap">
        <SectionTitle title={block.heading} />
        <ul className={`grid gap-3 sm:gap-4 ${cols}`}>
          {block.images.map((im, i) => (
            <Reveal as="li" key={i} delay={(i % 3) * 0.06}>
              {im.link ? (
                <SmartLink href={im.link} className="group block overflow-hidden rounded-[20px] bg-mist">
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    fit="cover"
                    className="aspect-[4/3] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                  />
                </SmartLink>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group block w-full overflow-hidden rounded-[20px] bg-mist"
                  aria-label={`Open image ${i + 1} of ${block.images.length}${im.image.alt ? `: ${im.image.alt}` : ""}`}
                >
                  <Img
                    image={im.image}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    fit="cover"
                    className="aspect-[4/3] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                  />
                </button>
              )}
              {im.caption && <p className="mt-2.5 text-[0.875rem] leading-snug text-muted">{im.caption}</p>}
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
        <Reveal className="wrap max-w-5xl text-center">
          {imageEl}
          <ButtonRow buttons={block.buttons} tone={onDark ? "dark" : undefined} align="center" className="mt-8" />
        </Reveal>
      </Section>
    );
  }
  return (
    <Section tone={block.tone}>
      <div className={`wrap grid items-center gap-10 md:gap-16 ${small ? "md:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr]" : "md:grid-cols-2"}`}>
        {imageEl && <Reveal className={imageLeft ? "" : "md:order-2"}>{imageEl}</Reveal>}
        <Reveal delay={0.08} className={imageLeft ? "" : "md:order-1"}>
          {block.heading && <h2 className={`headline mb-5 text-[clamp(1.75rem,3.5vw,2.75rem)] ${onDark ? "text-white" : "text-ink"}`}>{block.heading}</h2>}
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
                className="group flex h-full flex-col items-center rounded-[28px] bg-mist px-4 pb-6 pt-8 text-center transition-colors duration-300 hover:bg-[#ececf0] sm:pt-10"
              >
                <span className="grid aspect-square w-[62%] place-items-center">
                  {p.image ? (
                    <Img
                      image={p.image}
                      sizes="(min-width: 1024px) 18vw, 40vw"
                      className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                    />
                  ) : null}
                </span>
                <span className="mt-5 text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink sm:text-[1.0625rem]">{p.name}</span>
                <span className="mt-1 inline-flex items-center gap-0.5 text-[0.875rem] text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  Learn more <ChevronRight aria-hidden className="size-3.5" />
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
        {block.heading && <h2 className="headline text-[clamp(1.75rem,3.5vw,2.5rem)]">{block.heading}</h2>}
        <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
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

export function StatsBlock({ block }: { block: BlockOf<"stats"> }) {
  const onDark = dark(block.tone);
  const firstGroup = block.items[0]?.group;
  const headline = firstGroup ? block.items.filter((i) => i.group === firstGroup) : [];
  const rest = firstGroup ? block.items.filter((i) => i.group !== firstGroup) : block.items;
  const label = onDark ? "text-white/60" : "text-muted";
  return (
    <Section tone={block.tone} labelledBy={block.heading ? `stats-${block.id}` : undefined}>
      <div className="wrap">
        <SectionTitle id={`stats-${block.id}`} eyebrow={block.eyebrow} title={block.heading} onDark={onDark} />
        {headline.length > 0 && (
          <dl className="mx-auto grid max-w-4xl gap-10 text-center sm:grid-cols-2">
            {headline.map((s, i) => (
              <Reveal key={i} delay={i * 0.08} className="flex flex-col">
                <dd className="order-1 text-[clamp(3.5rem,9vw,6.5rem)] font-semibold leading-none tracking-[-0.05em]">
                  <CountUp value={s.value} />
                </dd>
                <dt className={`order-2 mt-3 text-[1.0625rem] ${label}`}>{s.label}</dt>
              </Reveal>
            ))}
          </dl>
        )}
        {rest.length > 0 && (
          <dl
            className={`mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 border-t pt-12 md:grid-cols-3 lg:grid-cols-4 ${onDark ? "border-white/15" : "border-hairline"}`}
          >
            {rest.map((s, i) => (
              <Reveal key={i} delay={(i % 4) * 0.05} className="flex flex-col">
                <dd className="order-1 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-[-0.04em]">
                  <CountUp value={s.value} />
                </dd>
                <dt className={`order-2 mt-2 text-[0.9375rem] leading-snug ${label}`}>{s.label}</dt>
                {s.note && <dd className={`order-3 mt-1 text-[0.8125rem] leading-snug ${onDark ? "text-white/45" : "text-muted"}`}>{s.note}</dd>}
              </Reveal>
            ))}
          </dl>
        )}
        {block.source && (
          <p className={`mt-14 text-center text-[0.8125rem] ${onDark ? "text-white/45" : "text-muted"}`}>
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
      <Reveal className={`tone-${tone === "paper" ? "sand" : tone} mx-auto max-w-[90rem] rounded-[32px] px-6 py-20 text-center md:py-28`}>
        <h2 className={`headline mx-auto max-w-3xl text-[clamp(2rem,5vw,3.75rem)] ${onDark ? "text-white" : "text-ink"}`}>{block.heading}</h2>
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
        <div className={`mx-auto grid max-w-5xl gap-4 ${block.videos.length > 1 ? "sm:grid-cols-2" : ""}`}>
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
