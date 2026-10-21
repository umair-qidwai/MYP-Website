import { useEffect, useState, type MouseEvent } from "react";
import { useReducedMotion } from "motion/react";
import type { Block } from "@shared/blocks";
import { headingsOf } from "./RichText";

export type OutlineItem = { id: string; text: string; level: number };

/** Anchor for a whole section, so its heading can be linked to. */
export const blockAnchor = (b: Block) => `section-${b.id}`;
/** Anchor for one card in an options section. */
export const optionAnchor = (blockId: string, i: number) => `option-${blockId}-${i}`;

// Sections whose heading names a part of the page (banners, quotes and calls to action don't)
const TITLED = new Set([
  "split",
  "cards",
  "options",
  "stats",
  "accordion",
  "gallery",
  "collection",
  "programs",
  "timeline",
  "downloads",
  "video",
  "embed",
  "social",
]);

/** The page's sections, in reading order: section headings plus headings written inside text. */
export function pageOutline(blocks: Block[]): OutlineItem[] {
  const out: OutlineItem[] = [];
  for (const b of blocks) {
    if (b.hidden) continue;
    if (b.type === "richText" && b.layout !== "lead") out.push(...headingsOf(b.doc).filter((h) => h.level <= 3));
    else if (b.type === "options") {
      // Cards people choose between (ways to give, volunteer roles) are worth jumping to individually
      if (b.heading) out.push({ id: blockAnchor(b), text: b.heading, level: 2 });
      if (b.items.length <= 12) b.items.forEach((it, i) => it.title && out.push({ id: optionAnchor(b.id, i), text: it.title, level: b.heading ? 3 : 2 }));
    } else if (b.type === "form" && b.title) out.push({ id: blockAnchor(b), text: b.title, level: 2 });
    else if (TITLED.has(b.type) && "heading" in b && b.heading) out.push({ id: blockAnchor(b), text: b.heading, level: 2 });
  }
  const seen = new Set<string>();
  return out.filter((h) => !seen.has(h.id) && seen.add(h.id));
}

/** Glide to an element on the page (instant for visitors who prefer reduced motion). */
export function scrollToId(id: string, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  history.replaceState(history.state, "", `#${id}`);
  // Keep keyboard and screen-reader users in step with the scroll
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}

/** "On this page" list: glides to a section and marks the one being read. */
export function OnThisPage({ items }: { items: OutlineItem[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // The last heading above the top third of the screen is the section being read
      let current = items[0]?.id;
      for (const h of items) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.33) current = h.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  const go = (e: MouseEvent, id: string) => {
    if (scrollToId(id, !reduce)) e.preventDefault();
  };

  return (
    <nav aria-label="On this page" className="sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto pb-6">
      <p className="mb-3 text-[0.8125rem] font-semibold text-ink">On this page</p>
      <ol className="space-y-0.5 border-l border-hairline text-[0.8125rem]">
        {items.map((h) => {
          const on = h.id === active;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => go(e, h.id)}
                aria-current={on ? "location" : undefined}
                className={`-ml-px block border-l-2 py-1.5 leading-snug transition-colors duration-300 ${h.level === 3 ? "pl-6" : "pl-4"} ${
                  on ? "border-brand font-medium text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
