import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

/** Gentle entrance as content scrolls into view. Content is never hidden from assistive tech. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const M = m[as];
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </M>
  );
}

/** Headline lines that rise out of a mask. */
export function MaskLines({
  lines,
  className = "",
  delay = 0,
  lineClassName = "",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  lineClassName?: string;
}) {
  const reduce = useReducedMotion();
  // Observe the (always visible) wrapper: the moving lines start fully clipped by their masks,
  // so observing them directly would never report them as in view.
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  return (
    <span ref={ref} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <m.span
            className={`block ${lineClassName}`}
            initial={reduce ? false : { y: "108%" }}
            animate={reduce || inView ? { y: "0%" } : { y: "108%" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.09 }}
          >
            {l}
          </m.span>
        </span>
      ))}
    </span>
  );
}

export function MosaicBars({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`mosaic-bars ${className}`}>
      <i className="bg-terracotta" />
      <i className="bg-saffron" />
      <i className="bg-leaf" />
      <i className="bg-teal" />
      <i className="bg-sky" />
      <i className="bg-plum" />
      <i className="bg-rose" />
    </div>
  );
}
