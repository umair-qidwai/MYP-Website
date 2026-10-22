import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ChevronRight, Download, FileText, Search } from "lucide-react";
import type { BlockOf, FileRef, ImageRef } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import type { PublicEntry } from "@shared/types";
import { Img } from "../components/Img";
import { Reveal } from "../components/Reveal";
import { SmartLink } from "../components/SmartLink";
import { Section, fmtSize } from "./Content";

export const fmtDate = (d?: unknown) => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, mo, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, day)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
};
const img = (v: unknown) => v as ImageRef | undefined;

export function CollectionBlock({ block, entries }: { block: BlockOf<"collection">; entries: PublicEntry[] }) {
  const def = getCollection(block.collection);
  let items = entries;
  if (block.filter) items = items.filter((e) => String(e.data.category ?? "") === block.filter);
  items = items.slice(0, block.limit);
  if (!def) return null;
  return (
    <Section>
      <div className="wrap">
        {block.heading && <h2 className="headline mb-10 text-center text-[clamp(1.75rem,3.5vw,2.5rem)]">{block.heading}</h2>}
        {block.collection === "events" && <EventsGrid items={items} />}
        {block.collection === "articles" && <ArticleList items={items} />}
        {block.collection === "news" && <NewsList items={items} />}
        {block.collection === "reports" && <Reports items={items} display={block.display} />}
        {items.length === 0 && <p className="text-center text-muted">Nothing here yet.</p>}
      </div>
    </Section>
  );
}

function EventsGrid({ items }: { items: PublicEntry[] }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(24);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((e) => e.title.toLowerCase().includes(s)) : items;
  }, [items, q]);
  if (!items.length) return null;
  return (
    <>
      {items.length > 12 && (
        <div className="mx-auto mb-12 flex max-w-xl flex-col items-center gap-3">
          <label className="relative block w-full">
            <span className="sr-only">Search events</span>
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(24);
              }}
              placeholder="Search events"
              className="h-12 w-full rounded-full bg-mist pl-11 pr-5 text-[1rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-brand/40"
            />
          </label>
          <p className="text-[0.875rem] text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </p>
        </div>
      )}
      <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, shown).map((e, i) => (
          <Reveal as="li" key={e.id} delay={(i % 3) * 0.05}>
            <Link to={`/events/${e.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-mist">
                {img(e.data.image) && (
                  <Img
                    image={img(e.data.image)!}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    fit="contain"
                    className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                  />
                )}
              </div>
              <h3 className="mt-4 text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] text-ink group-hover:text-brand">{e.title}</h3>
              <p className="mt-1 text-[0.875rem] text-muted">{[fmtDate(e.data.date), e.data.price].filter(Boolean).join(" · ")}</p>
            </Link>
          </Reveal>
        ))}
      </ul>
      {filtered.length > shown && (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + 24)}
            className="h-11 rounded-full bg-mist px-6 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-[#e8e8ed]"
          >
            Show more
          </button>
        </div>
      )}
    </>
  );
}

function ArticleList({ items }: { items: PublicEntry[] }) {
  return (
    <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
      {items.map((e, i) => (
        <Reveal as="li" key={e.id} delay={(i % 2) * 0.06}>
          <Link to={`/blog/${e.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-mist">
            {img(e.data.image) && (
              <div className="aspect-[16/10] overflow-hidden bg-white">
                <Img
                  image={img(e.data.image)!}
                  sizes="(min-width: 640px) 45vw, 100vw"
                  fit="contain"
                  className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                />
              </div>
            )}
            <div className="p-6">
              <p className="text-[0.8125rem] text-muted">{fmtDate(e.data.date)}</p>
              <h3 className="mt-2 text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] text-ink">{e.title}</h3>
              <span className="mt-4 inline-flex items-center gap-0.5 text-[0.9375rem] font-medium text-brand">
                Read <ChevronRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

function NewsList({ items }: { items: PublicEntry[] }) {
  return (
    <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
      {items.map((e, i) => {
        const url = String(e.data.url ?? "");
        return (
          <Reveal as="li" key={e.id} delay={(i % 2) * 0.06}>
            <article className="flex h-full flex-col overflow-hidden rounded-[24px] bg-mist">
              {img(e.data.image) && (
                <div className="aspect-[16/9] overflow-hidden bg-white">
                  <Img image={img(e.data.image)!} sizes="(min-width: 640px) 45vw, 100vw" fit="contain" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[0.8125rem] text-muted">{[String(e.data.outlet ?? ""), fmtDate(e.data.date)].filter(Boolean).join(" · ")}</p>
                <h3 className="mt-2 text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] text-ink">{e.title}</h3>
                {e.data.summary ? (
                  <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink-2">
                    {String(e.data.summary)
                      .split(/\n{2,}/)
                      .map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                  </div>
                ) : null}
                {url && (
                  <SmartLink href={url} className="mt-auto inline-flex items-center gap-1 pt-5 text-[0.9375rem] font-medium text-brand hover:underline">
                    Full Story Here <ArrowUpRight aria-hidden className="size-4" />
                  </SmartLink>
                )}
              </div>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}

/** Newest year first; reports without a year keep their order, after the dated ones. */
const yearOf = (e: PublicEntry) =>
  Number(
    String(e.data.year ?? "")
      .match(/\d{4}/g)
      ?.pop() ?? 0,
  );
const byYear = (list: PublicEntry[]) =>
  list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => yearOf(b.e) - yearOf(a.e) || a.i - b.i)
    .map((x) => x.e);

function Reports({ items: unsorted, display }: { items: PublicEntry[]; display: "grid" | "list" }) {
  const items = byYear(unsorted);
  const hrefOf = (e: PublicEntry) => (e.data.file as FileRef | undefined)?.url ?? String(e.data.url ?? "");
  if (display === "list") {
    return (
      <ul className="mx-auto grid max-w-2xl gap-2">
        {items.map((e) => {
          const href = hrefOf(e);
          const size = (e.data.file as FileRef | undefined)?.size;
          return (
            <li key={e.id}>
              {href ? (
                <SmartLink
                  href={href}
                  className="group flex items-center justify-between gap-4 rounded-2xl bg-mist px-5 py-4 transition-colors hover:bg-[#ececf0]"
                >
                  <span className="flex items-center gap-3">
                    <FileText aria-hidden className="size-5 text-muted" />
                    <span className="font-medium text-ink">{e.title}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[0.8125rem] text-muted">
                    {fmtSize(size)}
                    <Download aria-hidden className="size-4 text-brand" />
                  </span>
                </SmartLink>
              ) : (
                <span className="flex items-center gap-3 rounded-2xl bg-mist px-5 py-4 text-muted">
                  <FileText aria-hidden className="size-5" />
                  {e.title} — coming soon
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="mx-auto grid max-w-5xl grid-cols-2 justify-center gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {items.map((e, i) => {
        const href = hrefOf(e);
        const cover = img(e.data.cover);
        const size = (e.data.file as FileRef | undefined)?.size;
        return (
          <Reveal as="li" key={e.id} delay={(i % 4) * 0.05}>
            <SmartLink href={href || "#"} className="group block">
              <div className="overflow-hidden rounded-xl bg-mist shadow-[0_10px_30px_-12px_rgb(0_0_0/0.25)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
                {cover ? (
                  <Img image={cover} sizes="(min-width: 1024px) 22vw, 45vw" className="w-full" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center">
                    <FileText className="size-10 text-muted" />
                  </div>
                )}
              </div>
              <h3 className="mt-4 text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-brand">{e.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-muted">
                <Download className="size-3.5" aria-hidden /> PDF {fmtSize(size)}
              </p>
            </SmartLink>
          </Reveal>
        );
      })}
    </ul>
  );
}
