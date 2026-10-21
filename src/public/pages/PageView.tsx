import { Link } from "react-router";
import type { PageDoc } from "@shared/blocks";
import { LANGUAGES, type Lang } from "@shared/constants";
import type { PublicEntry } from "@shared/types";
import { Blocks } from "../blocks/BlockRenderer";
import { useSite } from "../SiteContext";
import { navLabel } from "../layout/Header";

/** The menu section a page belongs to (shown above its title). */
function useSection(path: string): string | null {
  const { settings } = useSite();
  const href = `/${path}`;
  if (settings.navigation.main.some((n) => n.href === href)) return null;
  for (const n of settings.navigation.main) {
    if (n.children.some((c) => c.href === href) && n.label.toUpperCase() !== "HOME") return navLabel(n.label);
  }
  return null;
}

export function LanguageSwitcher({ translations, current }: { translations: Record<string, string>; current: Lang }) {
  const order: Lang[] = ["en", "es", "fr", "ht", "ar", "so"];
  return (
    <nav aria-label="Language" className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-mist p-1">
      {order
        .filter((l) => translations[l] !== undefined)
        .map((l) => (
          <Link
            key={l}
            to={`/${translations[l]}`}
            lang={l}
            hrefLang={l}
            aria-current={l === current ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${l === current ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {LANGUAGES[l].label}
          </Link>
        ))}
    </nav>
  );
}

export function PageView({
  path,
  page,
  collections,
  translations,
}: {
  path: string;
  page: PageDoc;
  collections: Record<string, PublicEntry[]>;
  translations?: Record<string, string>;
}) {
  const section = useSection(path);
  const startsWithHero = page.blocks[0]?.type === "hero";
  const lang = (page.lang ?? "en") as Lang;
  const showTitle = !startsWithHero && !page.hideTitle;
  return (
    <article lang={page.lang} dir={LANGUAGES[lang]?.dir}>
      {showTitle ? (
        <header className="pb-4 pt-32 text-center sm:pt-36 md:pb-8" style={{ animation: "fade-up .9s var(--ease-out-expo) both" }}>
          <div className="wrap">
            {section && section.toLowerCase() !== page.title.toLowerCase() && <p className="eyebrow mb-4 text-muted">{section}</p>}
            <h1 className="display mx-auto max-w-3xl text-[clamp(2.125rem,4.6vw,3.5rem)] text-ink">{page.title}</h1>
            {page.intro && <p className="lede mx-auto mt-6 max-w-2xl">{page.intro}</p>}
            {translations && (
              <div className="mt-8">
                <LanguageSwitcher translations={translations} current={lang} />
              </div>
            )}
          </div>
        </header>
      ) : (
        <>
          {!startsWithHero && <div className="pt-28" />}
          {page.hideTitle && !startsWithHero && <h1 className="sr-only">{page.title}</h1>}
        </>
      )}
      <div className="pb-6 md:pb-10">
        <Blocks blocks={page.blocks} collections={collections} path={path} />
      </div>
    </article>
  );
}
