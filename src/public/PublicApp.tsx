import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { LazyMotion, MotionConfig } from "motion/react";
import type { PublicPagePayload } from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/settings-defaults";
import { readBootstrap } from "../lib/boot";
import { fetchPage, primePage } from "../lib/api";
import { SiteContext } from "./SiteContext";
import { Header } from "./layout/Header";
import { Footer } from "./layout/Footer";
import { PageView } from "./pages/PageView";
import { EntryView } from "./pages/EntryView";
import { SmartLink } from "./components/SmartLink";
import { MosaicBars } from "./components/Reveal";

const loadMotionFeatures = () => import("../lib/motionFeatures").then((r) => r.default);

const boot = typeof document !== "undefined" ? readBootstrap() : null;
const pathKey = (pathname: string) =>
  decodeURIComponent(pathname)
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

if (boot && !location.pathname.startsWith("/preview")) primePage(boot.data.path, boot.data);

export function PublicApp() {
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/preview");
  const key = isPreview ? (boot?.data.path ?? "") : pathKey(location.pathname);
  const [data, setData] = useState<PublicPagePayload | null>(() => (boot && (isPreview || boot.data.path === key) ? boot.data : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Path of the content currently shown; the server-provided first page is never refetched
  const loadedKey = useRef<string | null>(data?.path ?? null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isPreview) return;
    if (key === loadedKey.current) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchPage(key, ac.signal)
      .then((d) => {
        loadedKey.current = key;
        setData(d);
        setLoading(false);
        if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        // Move focus to the new content for screen-reader and keyboard users
        requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setLoading(false);
        setError(String(e?.message ?? e));
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Document title + language for client-side navigations
  useEffect(() => {
    if (!data) return;
    const name = boot?.settings.site.name ?? "MY Project USA";
    if (data.kind === "page") {
      document.title = data.page.seo.title || (data.path === "" ? name : `${data.page.title} | ${name}`);
      document.documentElement.lang = data.page.lang ?? "en";
      document.documentElement.dir = data.page.lang === "ar" ? "rtl" : "ltr";
    } else if (data.kind === "entry") {
      document.title = `${data.entry.title} | ${name}`;
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    } else if (data.kind === "notFound") document.title = `Page not found | ${name}`;
  }, [data]);

  const ctx = useMemo(
    () => ({ settings: boot?.settings ?? DEFAULT_SETTINGS, turnstileSiteKey: boot?.turnstileSiteKey ?? "", preview: isPreview }),
    [isPreview],
  );
  const announcement = ctx.settings.announcement;

  return (
    <SiteContext.Provider value={ctx}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          {loading && (
            <div
              aria-hidden
              className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-plum"
              style={{ animation: "progress 1.2s var(--ease-out-expo) forwards" }}
            />
          )}
          {isPreview && (
            <div className="sticky top-0 z-[45] flex items-center justify-center gap-3 bg-saffron px-4 py-2 text-center text-sm font-semibold text-ink">
              Preview — this is a draft and is not visible to the public.
              <Link to="/admin/" className="underline">
                Back to editor
              </Link>
            </div>
          )}
          {announcement.enabled && announcement.text && (
            <div className="bg-ink px-4 py-2.5 text-center text-sm text-paper">
              {announcement.text}{" "}
              {announcement.href && (
                <SmartLink href={announcement.href} className="font-semibold text-saffron underline underline-offset-4">
                  {announcement.linkLabel || "Learn more"}
                </SmartLink>
              )}
            </div>
          )}
          <Header />
          <main id="main" ref={mainRef} tabIndex={-1} className="outline-none" aria-busy={loading}>
            {error && !data ? <ErrorState message={error} /> : null}
            {data?.kind === "page" && (
              <PageView key={data.path} path={data.path} page={data.page} collections={data.collections} translations={data.translations} />
            )}
            {data?.kind === "entry" && <EntryView key={data.path} collection={data.collection} entry={data.entry} related={data.related} />}
            {data?.kind === "notFound" && <NotFound />}
          </main>
          <Footer />
        </MotionConfig>
      </LazyMotion>
    </SiteContext.Provider>
  );
}

function NotFound() {
  return (
    <section className="grain overflow-hidden py-24 md:py-36">
      <div className="wrap">
        <MosaicBars className="mb-10 w-28 overflow-hidden rounded-full" />
        <p className="eyebrow text-plum">Error 404</p>
        <h1 className="display mt-5 text-[clamp(3rem,10vw,9rem)]">
          This page has <span className="serif-accent text-plum">moved on.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-ink-2">
          We couldn&rsquo;t find the page you were looking for. It may have been renamed when our website was rebuilt.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className="rounded-full bg-ink px-6 py-3.5 font-semibold text-paper hover:bg-plum">
            Go to the homepage
          </Link>
          <Link to="/contacts" className="rounded-full px-6 py-3.5 font-semibold ring-1 ring-ink/20 hover:bg-ink/5">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="wrap py-28">
      <h1 className="display text-5xl">Something went wrong</h1>
      <p className="mt-4 text-ink-2">We couldn&rsquo;t load this page. Please check your connection and try again.</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <button type="button" onClick={() => location.reload()} className="mt-8 rounded-full bg-ink px-6 py-3 font-semibold text-paper">
        Try again
      </button>
    </section>
  );
}
