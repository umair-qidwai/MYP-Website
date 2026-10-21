import { Link } from "react-router";
import { Globe } from "lucide-react";
import { LANGUAGES, type Lang, type PageDoc } from "@shared/blocks";
import type { PublicEntry } from "@shared/types";
import { Blocks } from "../blocks/BlockRenderer";
import { MaskLines, MosaicBars } from "../components/Reveal";
import { useSite } from "../SiteContext";

function useSection(path: string): string | null {
  const { settings } = useSite();
  const href = `/${path}`;
  // Pages that are themselves top-level menu items don't get a parent label
  if (settings.navigation.main.some((n) => n.href === href)) return null;
  for (const n of settings.navigation.main) {
    if (n.children.some((c) => c.href === href) && n.label.toUpperCase() !== "HOME") {
      return n.label === n.label.toUpperCase() ? n.label.split(" ").map((w) => (w === "MY" || w === "USA" ? w : w[0] + w.slice(1).toLowerCase())).join(" ") : n.label;
    }
  }
  return null;
}

export function LanguageSwitcher({ translations, current }: { translations: Record<string, string>; current: Lang }) {
  const order: Lang[] = ["en", "es", "fr", "ht", "ar", "so"];
  return (
    <nav aria-label="Language" className="flex flex-wrap items-center gap-1.5">
      <Globe aria-hidden className="mr-1 size-4 text-muted" />
      {order
        .filter((l) => translations[l] !== undefined)
        .map((l) => (
          <Link
            key={l}
            to={`/${translations[l]}`}
            lang={l}
            hrefLang={l}
            aria-current={l === current ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${l === current ? "bg-ink text-paper" : "ring-1 ring-ink/15 hover:bg-ink/5"}`}
          >
            {LANGUAGES[l].label}
          </Link>
        ))}
    </nav>
  );
}

export function PageView({ path, page, collections, translations }: { path: string; page: PageDoc; collections: Record<string, PublicEntry[]>; translations?: Record<string, string> }) {
  const section = useSection(path);
  const startsWithHero = page.blocks[0]?.type === "hero";
  const lang = (page.lang ?? "en") as Lang;
  return (
    <article lang={page.lang} dir={LANGUAGES[lang]?.dir}>
      {!startsWithHero && !page.hideTitle && (
        <header className="grain relative overflow-hidden pb-8 pt-12 md:pb-12 md:pt-20">
          <div className="wrap">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {section && section.toLowerCase() !== page.title.toLowerCase() ? <p className="eyebrow text-plum">{section}</p> : <span />}
              {translations && <LanguageSwitcher translations={translations} current={lang} />}
            </div>
            <h1 className="display mt-6 max-w-[18ch] text-[clamp(2.8rem,8.5vw,7.8rem)]">
              <MaskLines lines={[page.title]} />
            </h1>
            {page.intro && <p className="mt-8 max-w-2xl text-xl text-ink-2">{page.intro}</p>}
            <MosaicBars className="mt-10 w-full max-w-xs overflow-hidden rounded-full md:mt-14" />
          </div>
        </header>
      )}
      {(startsWithHero || page.hideTitle) && <h1 className="sr-only">{page.title}</h1>}
      <div className="pb-16 md:pb-24">
        <Blocks blocks={page.blocks} collections={collections} path={path} />
      </div>
    </article>
  );
}
