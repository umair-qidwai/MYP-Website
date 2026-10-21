import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { BlockOf } from "@shared/blocks";
import { RichText } from "../components/RichText";
import { ButtonRow } from "../components/Button";
import { Img } from "../components/Img";
import { useSite } from "../SiteContext";

/**
 * Page-opening headline: logo, headline, short intro and buttons, with the photo below easing to
 * full size as the visitor scrolls. The photo keeps its own proportions, so nothing is cropped.
 */
export function HeroBlock({ block }: { block: BlockOf<"hero"> }) {
  const { settings } = useSite();
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "start 0.3"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, 0]);
  const ratio = block.image?.width && block.image?.height ? block.image.width / block.image.height : 16 / 9;
  const isHome = block.variant === "sculpture" || block.variant === "image";

  return (
    <section className="bg-gradient-to-b from-white via-white to-mist/70 pb-16 pt-28 sm:pb-20 sm:pt-32" aria-labelledby="hero-title">
      <div className="wrap text-center">
        <div style={{ animation: reduce ? undefined : "fade-up 1s var(--ease-out-expo) both" }}>
          {isHome && settings.site.logo && (
            <img
              src={settings.site.logo.src}
              alt=""
              width={88}
              height={88}
              className="mx-auto mb-6 size-20 object-contain mix-blend-multiply sm:size-[5.5rem]"
            />
          )}
          {block.eyebrow && <p className="eyebrow mb-3 text-brand">{block.eyebrow}</p>}
          <h1 id="hero-title" className="display mx-auto max-w-3xl text-[clamp(2.25rem,5.2vw,4rem)] text-ink">
            {block.heading}
          </h1>
        </div>
        <div style={{ animation: reduce ? undefined : "fade-up 1s var(--ease-out-expo) .12s both" }}>
          <RichText doc={block.body} className="lede mx-auto mt-5 max-w-xl [&_p+p]:mt-3" />
          <ButtonRow buttons={block.buttons} align="center" className="mt-8" />
        </div>
      </div>
      {block.image && block.variant !== "plain" && (
        <div ref={frame} className="mx-auto mt-12 max-w-5xl px-4 sm:mt-14 sm:px-6">
          <m.div
            style={{ scale, y, aspectRatio: String(ratio) }}
            className="relative overflow-hidden rounded-[24px] bg-mist shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] will-change-transform sm:rounded-[28px]"
          >
            <Img image={block.image} priority sizes="(min-width: 1024px) 64rem, 100vw" fit="cover" />
          </m.div>
        </div>
      )}
    </section>
  );
}
