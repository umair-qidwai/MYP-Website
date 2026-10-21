import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { BlockOf } from "@shared/blocks";
import { RichText } from "../components/RichText";
import { ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { MuralRibbon } from "../components/MuralRibbon";

/** "Protect. Educate. Empower Our Youth." → the last sentence is set in the brand colour. */
function Headline({ text }: { text: string }) {
  const parts = text.match(/[^.!?]+[.!?]+\s*/g);
  if (!parts || parts.length < 2) return <>{text}</>;
  const last = parts.pop()!;
  return (
    <>
      {parts.join("")}
      <span className="text-brand">{last.trim()}</span>
    </>
  );
}

/**
 * Page-opening section. With a photo: headline, one-line mission and buttons beside the photo (which
 * keeps its own proportions), then the mural band. Without: a centred headline.
 */
export function HeroBlock({ block }: { block: BlockOf<"hero"> }) {
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-24, 24]);
  const ratio = block.image?.width && block.image?.height ? block.image.width / block.image.height : 4 / 3;
  const withImage = !!block.image && block.variant !== "plain";
  const enter = (delay: number) => ({ animation: reduce ? undefined : `fade-up 1s var(--ease-out-expo) ${delay}s both` });

  if (!withImage) {
    return (
      <section className="pb-12 pt-32 text-center sm:pt-36" aria-labelledby="hero-title">
        <div className="wrap" style={enter(0)}>
          {block.eyebrow && <p className="eyebrow mb-3 text-brand">{block.eyebrow}</p>}
          <h1 id="hero-title" className="display mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)] text-ink">
            <Headline text={block.heading} />
          </h1>
          <RichText doc={block.body} className="lede mx-auto mt-5 max-w-xl [&_p+p]:mt-3" />
          <ButtonRow buttons={block.buttons} align="center" className="mt-8" />
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden pt-28 sm:pt-32" aria-labelledby="hero-title">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <div style={enter(0)}>
            {block.eyebrow && <p className="eyebrow mb-4 text-brand">{block.eyebrow}</p>}
            <h1 id="hero-title" className="display text-[clamp(2.5rem,5.4vw,4.5rem)] text-ink">
              <Headline text={block.heading} />
            </h1>
          </div>
          <div style={enter(0.12)}>
            <RichText doc={block.body} className="lede mt-6 max-w-xl [&_p+p]:mt-3" />
            <ButtonRow buttons={block.buttons} className="mt-8" />
          </div>
        </div>
        <div ref={frame} style={enter(0.2)}>
          <m.div style={{ y, aspectRatio: String(ratio) }} className="overflow-hidden rounded-[28px] bg-mist shadow-[0_40px_80px_-40px_rgb(40_20_70/0.45)]">
            <Img image={block.image!} priority sizes="(min-width: 1024px) 40rem, 100vw" fit="cover" />
          </m.div>
        </div>
      </div>
      <MuralRibbon className="mt-16 sm:mt-24" />
    </section>
  );
}
