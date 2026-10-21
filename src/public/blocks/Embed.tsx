import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { BlockOf } from "@shared/blocks";
import { Section } from "./Content";

/** YouTube facade: a poster image until the visitor presses play (faster pages, no tracking until then). */
function LiteYouTube({ url, title }: { url: string; title: string }) {
  const [on, setOn] = useState(false);
  const u = new URL(url);
  const id = u.pathname.match(/\/embed\/([^/?]+)/)?.[1] ?? "";
  const isList = id === "videoseries";
  const src = `${url}${url.includes("?") ? "&" : "?"}autoplay=1&rel=0`;
  if (on || isList) {
    return (
      <iframe
        src={isList && !on ? url : src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 h-full w-full"
      />
    );
  }
  return (
    <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${title}`}>
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
      <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-xl backdrop-blur transition-transform duration-500 group-hover:scale-105">
        <Play className="ml-1 size-7 fill-current" aria-hidden />
      </span>
      <span className="absolute bottom-5 left-5 right-5 text-left font-semibold text-paper">{title}</span>
    </button>
  );
}

/**
 * Bloomerang sign-up widget, isolated in a sandboxed iframe with an opaque origin:
 * its third-party script can't read this site's cookies or call the CMS API.
 */
function Bloomerang({ url, title }: { url: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(420);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const h = Number((e.data as { mypEmbedHeight?: number })?.mypEmbedHeight);
      if (h > 50 && h < 5000) setHeight(Math.ceil(h) + 8);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const widget = url.match(/(\d+)\.js$/)?.[1] ?? "";
  return (
    <iframe
      ref={ref}
      src={`/static/embed/bloomerang.html?w=${widget}`}
      title={title}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      loading="lazy"
      className="w-full rounded-2xl bg-white"
      style={{ height }}
    />
  );
}

export function EmbedBlock({ block }: { block: BlockOf<"embed"> }) {
  const aspect = { "16:9": "aspect-video", "4:3": "aspect-[4/3]", "1:1": "aspect-square", tall: "h-[min(80vh,900px)]", form: "h-[min(1100px,140vh)]" }[
    block.aspect
  ];
  const host = (() => {
    try {
      return new URL(block.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  return (
    <Section>
      <div className="wrap">
        <div className={`mx-auto ${block.aspect === "form" ? "max-w-3xl" : "max-w-5xl"}`}>
          {block.provider === "bloomerang" ? (
            <Bloomerang url={block.url} title={block.title} />
          ) : (
            <>
              <div className={`relative overflow-hidden rounded-[24px] bg-mist ${aspect}`}>
                {block.provider === "youtube" ? (
                  <LiteYouTube url={block.url} title={block.title} />
                ) : (
                  <iframe
                    src={block.url}
                    title={block.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full bg-white"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow={block.provider === "google-map" ? "fullscreen" : undefined}
                  />
                )}
              </div>
              {block.provider !== "youtube" && (
                <p className="mt-3 text-sm text-muted">
                  <a
                    href={block.url.replace("embedded=true", "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                  >
                    {block.provider === "google-form" ? "Open this form in a new tab" : `Open on ${host}`}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
