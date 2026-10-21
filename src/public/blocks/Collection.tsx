import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Download, FileText, Search } from "lucide-react";
import type { BlockOf, FileRef, ImageRef } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import type { PublicEntry } from "@shared/types";
import { Img } from "../components/Img";
import { Reveal } from "../components/Reveal";
import { SmartLink } from "../components/SmartLink";
import { Section, fmtSize } from "./Content";

export const fmtDate = (d?: unknown) => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
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
        {block.heading && <h2 className="display mb-10 text-[clamp(2rem,4vw,3.4rem)]">{block.heading}</h2>}
        {block.collection === "events" && <EventsGrid items={items} />}
        {block.collection === "articles" && <ArticleList items={items} />}
        {block.collection === "news" && <NewsList items={items} />}
        {block.collection === "reports" && <Reports items={items} display={block.display} />}
        {items.length === 0 && <p className="text-muted">Nothing here yet.</p>}
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
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </p>
          <label className="relative block w-full sm:max-w-sm">
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
              className="w-full rounded-full border border-ink/15 bg-white py-3 pl-11 pr-5 outline-none focus:border-plum focus:ring-4 focus:ring-plum/15"
            />
          </label>
        </div>
      )}
      <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, shown).map((e, i) => (
          <Reveal as="li" key={e.id} delay={(i % 3) * 0.05}>
            <Link to={`/events/${e.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-paper-2">
                {img(e.data.image) ? (
                  <Img
                    image={img(e.data.image)!}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    fit="cover"
                    className="transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <Placeholder title={e.title} />
                )}
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <h3 className="text-[1.15rem] font-semibold leading-snug transition-colors group-hover:text-plum">{e.title}</h3>
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 size-5 shrink-0 opacity-40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </div>
              <p className="mt-1 text-sm text-muted">{[fmtDate(e.data.date), e.data.price].filter(Boolean).join(" · ")}</p>
            </Link>
          </Reveal>
        ))}
      </ul>
      {filtered.length > shown && (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + 24)}
            className="rounded-full px-7 py-3.5 font-semibold ring-1 ring-ink/20 transition-colors hover:bg-ink hover:text-paper"
          >
            Show more events ({filtered.length - shown} more)
          </button>
        </div>
      )}
    </>
  );
}

function Placeholder({ title }: { title: string }) {
  const colors = ["bg-terracotta", "bg-saffron", "bg-teal", "bg-plum", "bg-leaf", "bg-sky"];
  const c = colors[[...title].reduce((n, ch) => n + ch.charCodeAt(0), 0) % colors.length];
  return (
    <div className={`flex h-full items-end p-5 ${c}`}>
      <span className="display text-2xl text-white/90">{title}</span>
    </div>
  );
}

function ArticleList({ items }: { items: PublicEntry[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((e) => (
        <li key={e.id}>
          <Link to={`/blog/${e.slug}`} className="group grid gap-5 py-8 md:grid-cols-12 md:items-center">
            <p className="eyebrow text-muted md:col-span-2">{fmtDate(e.data.date)}</p>
            <h3 className="display text-[clamp(1.6rem,3vw,2.4rem)] transition-colors group-hover:text-plum md:col-span-7">{e.title}</h3>
            <div className="hidden overflow-hidden rounded-2xl md:col-span-3 md:block">
              {img(e.data.image) && (
                <Img image={img(e.data.image)!} sizes="25vw" fit="cover" className="aspect-[3/2] transition-transform duration-700 group-hover:scale-[1.04]" />
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NewsList({ items }: { items: PublicEntry[] }) {
  return (
    <ul className="grid gap-16">
      {items.map((e, i) => {
        const url = String(e.data.url ?? "");
        return (
          <Reveal as="li" key={e.id}>
            <article className={`grid items-center gap-8 md:grid-cols-12 md:gap-12`}>
              {img(e.data.image) && (
                <div className={`overflow-hidden rounded-[22px] bg-paper-2 md:col-span-6 ${i % 2 ? "md:order-2" : ""}`}>
                  <Img image={img(e.data.image)!} sizes="(min-width: 768px) 50vw, 100vw" className="w-full" />
                </div>
              )}
              <div className="md:col-span-6">
                <p className="eyebrow text-plum">
                  {String(e.data.outlet ?? "")}
                  {e.data.date ? <span className="text-muted"> · {fmtDate(e.data.date)}</span> : null}
                </p>
                <h3 className="display mt-4 text-[clamp(1.8rem,3.2vw,2.8rem)]">{e.title}</h3>
                {e.data.summary ? (
                  <div className="prose-myp mt-5">
                    {String(e.data.summary)
                      .split(/\n{2,}/)
                      .map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                  </div>
                ) : null}
                {url && (
                  <SmartLink
                    href={url}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-ink underline decoration-ink/30 underline-offset-[0.3em] hover:decoration-ink"
                  >
                    Full Story Here <ArrowUpRight className="size-4" aria-hidden />
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

function Reports({ items, display }: { items: PublicEntry[]; display: "grid" | "list" }) {
  const hrefOf = (e: PublicEntry) => (e.data.file as FileRef | undefined)?.url ?? String(e.data.url ?? "");
  if (display === "list") {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => {
          const href = hrefOf(e);
          const size = (e.data.file as FileRef | undefined)?.size;
          return (
            <li key={e.id}>
              {href ? (
                <SmartLink
                  href={href}
                  className="group flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 ring-1 ring-ink/5 transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="flex items-center gap-3">
                    <FileText aria-hidden className="size-5 text-plum group-hover:text-saffron" />
                    <span className="font-semibold">{e.title}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs opacity-70">
                    {fmtSize(size)}
                    <Download aria-hidden className="size-4" />
                  </span>
                </SmartLink>
              ) : (
                <span className="flex items-center gap-3 rounded-2xl bg-paper-2 px-5 py-4 text-muted">
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
    <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {items.map((e) => {
        const href = hrefOf(e);
        const cover = img(e.data.cover);
        const size = (e.data.file as FileRef | undefined)?.size;
        return (
          <Reveal as="li" key={e.id}>
            <SmartLink href={href || "#"} className="group block">
              <div className="overflow-hidden rounded-[14px] bg-paper-2 shadow-[0_20px_40px_-24px_rgb(25_22_19/0.5)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:-rotate-1">
                {cover ? (
                  <Img image={cover} sizes="(min-width: 1024px) 22vw, 45vw" className="w-full" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center">
                    <FileText className="size-10 text-muted" />
                  </div>
                )}
              </div>
              <h3 className="mt-4 font-semibold leading-snug group-hover:text-plum">{e.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Download className="size-3.5" aria-hidden /> PDF {fmtSize(size)}
              </p>
            </SmartLink>
          </Reveal>
        );
      })}
    </ul>
  );
}
