import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { BlockOf } from "@shared/blocks";
import { RichText } from "../components/RichText";
import { ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { MaskLines, MosaicBars } from "../components/Reveal";
import { CssSculpture } from "../hero/CssSculpture";
import { hasWebGL, isLowPowerDevice, usePrefersReducedMotion } from "../../lib/motion";

const HeroSculpture = lazy(() => import("../hero/HeroSculpture"));

gsap.registerPlugin(ScrollTrigger);

/** Split a heading into sentence lines; the tail of the last line is set in the serif accent. */
function headingLines(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return [text];
  return parts.map((p, i) => {
    if (i !== parts.length - 1) return p;
    const words = p.split(" ");
    if (words.length < 2) return p;
    return (
      <>
        {words[0]} <span className="serif-accent text-plum">{words.slice(1).join(" ")}</span>
      </>
    );
  });
}

export function HeroBlock({ block }: { block: BlockOf<"hero"> }) {
  if (block.variant === "sculpture") return <SculptureHero block={block} />;
  return (
    <section className="relative overflow-hidden">
      <div className="wrap grid items-end gap-10 pb-16 pt-14 md:grid-cols-12 md:pb-24 md:pt-20">
        <div className={block.image && block.variant === "image" ? "md:col-span-7" : "md:col-span-10"}>
          {block.eyebrow && <p className="eyebrow mb-6 text-plum">{block.eyebrow}</p>}
          <h1 className="display text-[clamp(2.75rem,8vw,7.5rem)]">
            <MaskLines lines={headingLines(block.heading)} />
          </h1>
          <RichText doc={block.body} className="prose-myp prose-lead mt-8 max-w-[38ch]" />
          <ButtonRow buttons={block.buttons} className="mt-10" />
        </div>
        {block.image && block.variant === "image" && (
          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-[28px]">
              <Img image={block.image} priority sizes="(min-width: 768px) 40vw, 100vw" fit="cover" className="aspect-[4/5]" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SculptureHero({ block }: { block: BlockOf<"hero"> }) {
  const section = useRef<HTMLElement>(null);
  const textCol = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const reduced = usePrefersReducedMotion();
  const [use3d, setUse3d] = useState(false);
  const [ready3d, setReady3d] = useState(false);
  const [lowPower] = useState(() => isLowPowerDevice() || (typeof window !== "undefined" && window.innerWidth < 768));

  // Load the 3D scene after the page is idle so it never competes with first paint.
  useEffect(() => {
    if (!hasWebGL()) return;
    const start = () => setUse3d(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(start, { timeout: 1800 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(start, 600);
    return () => window.clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    if (reduced || !section.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });
      gsap.to(textCol.current, { yPercent: -14, opacity: 0.35, ease: "none", scrollTrigger: { trigger: section.current, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(stage.current, { yPercent: 10, ease: "none", scrollTrigger: { trigger: section.current, start: "top top", end: "bottom top", scrub: true } });
    }, section);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={section} className="grain relative overflow-hidden" style={{ minHeight: "calc(100svh - var(--header-h))" }} aria-labelledby="hero-title">
      {/* soft warm light behind the sculpture */}
      <div aria-hidden className="pointer-events-none absolute -right-[10%] top-[8%] size-[70vmin] rounded-full bg-[radial-gradient(closest-side,#fff8ec,transparent)] opacity-90" />
      <div className="wrap relative grid min-h-[inherit] grid-rows-[auto_1fr] gap-4 pb-10 pt-8 lg:grid-cols-12 lg:grid-rows-1 lg:items-center lg:pb-14 lg:pt-6">
        <div ref={textCol} className="relative z-10 lg:col-span-8 xl:col-span-7">
          <h1 id="hero-title" className="display text-[clamp(3.4rem,8.6vw,8.6rem)] text-ink">
            <MaskLines lines={headingLines(block.heading)} delay={0.1} />
          </h1>
          <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[minmax(0,34rem)] lg:mt-12">
            <div style={{ animation: reduced ? undefined : "fade-up 1s var(--ease-out-expo) .55s both" }}>
              <RichText doc={block.body} className="prose-myp text-[clamp(1.05rem,0.95rem+0.35vw,1.25rem)] leading-relaxed text-ink-2" />
              <ButtonRow buttons={block.buttons} className="mt-8" />
            </div>
          </div>
        </div>
        <div ref={stage} className="relative -mx-[var(--gutter)] h-[min(58vh,28rem)] sm:h-[34rem] lg:absolute lg:bottom-0 lg:right-0 lg:top-[4%] lg:mx-0 lg:h-auto lg:w-[56%]">
          <CssSculpture className={`transition-opacity duration-1000 ${ready3d ? "opacity-0" : "opacity-100"}`} />
          {use3d && (
            <Suspense fallback={null}>
              <div className={`absolute inset-0 transition-opacity duration-1000 ${ready3d ? "opacity-100" : "opacity-0"}`}>
                <HeroSculpture progress={progress} reduced={reduced} lowPower={lowPower} onReady={() => setReady3d(true)} />
              </div>
            </Suspense>
          )}
        </div>
      </div>
      <div className="wrap relative z-10 flex items-center justify-between pb-6 text-sm text-muted">
        <MosaicBars className="!h-[5px] w-28 overflow-hidden rounded-full" />
        <span className="hidden items-center gap-3 sm:flex" aria-hidden>
          Scroll
          <span className="relative block h-9 w-px overflow-hidden bg-ink/15">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-ink" style={{ animation: reduced ? undefined : "scroll-cue 2.2s var(--ease-in-out-quint) infinite" }} />
          </span>
        </span>
      </div>
    </section>
  );
}
