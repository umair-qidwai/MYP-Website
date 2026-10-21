import { useEffect, useRef, useState, type ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import type { PageDoc } from "@shared/blocks";
import type { Settings } from "@shared/settings";
import type { PublicEntry } from "@shared/types";
import { SiteContext } from "../../public/SiteContext";
import { PageView } from "../../public/pages/PageView";
import { api } from "../api";

const VIRTUAL_WIDTH = 1280;

let settingsCache: Promise<Settings> | null = null;
export function useSiteSettings() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    settingsCache ??= api.get<{ settings: Settings }>("/api/admin/settings").then((r) => r.settings);
    settingsCache.then(setS).catch(() => {});
  }, []);
  return s;
}
export const invalidateSettings = () => {
  settingsCache = null;
};

/** Renders the in-progress page with the real website components. Links are inert: the capture
 * handler cancels clicks before react-router's Link would navigate. */
export function LivePreview({
  path,
  doc,
  collections,
  children,
}: {
  path: string;
  doc: PageDoc;
  collections: Record<string, PublicEntry[]>;
  children?: ReactNode;
}) {
  const settings = useSiteSettings();
  // Lay the page out at desktop width and scale it down to fit the pane (CSS zoom keeps scrolling natural)
  const host = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  useEffect(() => {
    if (!host.current) return;
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 0 && setZoom(Math.min(1, e.contentRect.width / VIRTUAL_WIDTH)));
    ro.observe(host.current);
    return () => ro.disconnect();
  }, []);
  return (
    // Visual-only copy of the page: hidden from screen readers and keyboard focus (the form is the editor)
    <div ref={host} className="w-full" aria-hidden inert>
      {settings && (
        <SiteContext.Provider
          value={{
            settings,
            turnstileSiteKey: "",
            preview: true,
            embedded: true,
          }}
        >
          <LazyMotion features={() => import("../../lib/motionFeatures").then((r) => r.default)}>
            <MotionConfig reducedMotion="always">
              <div
                style={{ width: VIRTUAL_WIDTH, zoom }}
                className="pointer-events-auto bg-paper text-ink [font-size:1rem]"
                onClickCapture={(e) => {
                  // Keep editors inside the editor: preview links don't navigate
                  if ((e.target as HTMLElement).closest("a")) e.preventDefault();
                }}
              >
                <PageView path={path} page={{ ...doc, blocks: doc.blocks.filter((b) => !b.hidden) }} collections={collections} />
                {children}
              </div>
            </MotionConfig>
          </LazyMotion>
        </SiteContext.Provider>
      )}
    </div>
  );
}
