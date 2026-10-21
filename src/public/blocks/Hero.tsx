import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { BlockOf } from "@shared/blocks";
import { RichText } from "../components/RichText";
import { ButtonRow } from "../components/Button";
import { Img } from "../components/Img";

/**
 * Page-opening headline. Centred text; if there's a photo it sits below and gently expands to
 * full width as the visitor scrolls (the only scroll-linked effect on the site).
 */
export function HeroBlock({ block }: { block: BlockOf<"hero"> }) {
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "start 0.25"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.88, 1]);
  const radius = useTransform(scrollYProgress, [0, 1], reduce ? [28, 28] : [40, 28]);

  return (
    <section className="pt-36 sm:pt-40" aria-labelledby="hero-title">
      <div className="wrap text-center">
        <div style={{ animation: reduce ? undefined : "fade-up 1s var(--ease-out-expo) both" }}>
          {block.eyebrow && <p className="eyebrow mb-4 text-brand">{block.eyebrow}</p>}
          <h1 id="hero-title" className="display mx-auto max-w-4xl text-[clamp(2.75rem,7vw,5.25rem)] text-ink">
            {block.heading}
          </h1>
        </div>
        <div style={{ animation: reduce ? undefined : "fade-up 1s var(--ease-out-expo) .12s both" }}>
          <RichText doc={block.body} className="lede mx-auto mt-6 max-w-2xl [&_p+p]:mt-3" />
          <ButtonRow buttons={block.buttons} align="center" className="mt-9" />
        </div>
      </div>
      {block.image && block.variant !== "plain" && (
        <div ref={frame} className="mx-auto mt-16 max-w-[90rem] px-3 sm:mt-20 sm:px-4">
          <m.div style={{ scale, borderRadius: radius }} className="relative aspect-[4/3] overflow-hidden bg-mist will-change-transform sm:aspect-[16/9]">
            <Img image={block.image} priority sizes="100vw" fit="cover" className="object-[50%_80%]" />
          </m.div>
        </div>
      )}
    </section>
  );
}
