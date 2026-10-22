import { m, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/** A gentle fade-up as content scrolls into view. The only entrance animation on the site. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const M = m[as];
  if (reduce)
    return (
      <M className={className} style={style}>
        {children}
      </M>
    );
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </M>
  );
}
