import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageRef } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import type { RichDoc } from "@shared/richtext";
import type { PublicEntry } from "@shared/types";
import { Img } from "../components/Img";
import { RichText } from "../components/RichText";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/Button";
import { fmtDate } from "../blocks/Collection";

export function EntryView({ collection, entry, related }: { collection: string; entry: PublicEntry; related: PublicEntry[] }) {
  const def = getCollection(collection);
  const d = entry.data;
  const image = d.image as ImageRef | undefined;
  const back = def?.publicPath ? `/${def.publicPath}` : "/";
  const isEvent = collection === "events";
  const meta = [
    d.date ? fmtDate(d.date) : null,
    d.time ? String(d.time) : null,
    d.location ? String(d.location) : null,
    d.price ? String(d.price) : null,
    !isEvent && d.author ? String(d.author) : null,
  ].filter(Boolean) as string[];

  return (
    <article>
      <header className="pt-32 text-center sm:pt-36" style={{ animation: "fade-up .9s var(--ease-out-expo) both" }}>
        <div className="wrap">
          <Link to={back} className="inline-flex items-center gap-0.5 text-[0.875rem] text-brand hover:underline">
            <ChevronLeft className="size-4" aria-hidden /> {isEvent ? "All events" : (def?.label ?? "Back")}
          </Link>
          <h1 className="display mx-auto mt-4 max-w-3xl text-[clamp(2rem,4.4vw,3.25rem)] text-ink">{entry.title}</h1>
          {meta.length > 0 && <p className="mt-5 text-[1.0625rem] text-muted">{meta.join(" · ")}</p>}
        </div>
      </header>

      {image && (
        <Reveal className="mx-auto mt-10 max-w-3xl px-[var(--gutter)] md:mt-12">
          <Img image={image} priority sizes="(min-width: 1024px) 64rem, 100vw" className="w-full rounded-[28px]" />
        </Reveal>
      )}

      {(Boolean(d.summary) || Boolean(d.body) || Boolean(d.registerUrl)) && (
        <div className="wrap-text py-14 md:py-20">
          {d.summary ? <p className="lede mb-8 !text-ink">{String(d.summary)}</p> : null}
          <RichText doc={d.body as RichDoc | undefined} />
          {d.registerUrl ? <Button href={String(d.registerUrl)} label={String(d.registerLabel || "Register")} className="mt-8" /> : null}
        </div>
      )}

      {related.length > 0 && def?.publicPath && (
        <section className="mt-12 bg-mist py-20 md:py-24" aria-labelledby="related-h">
          <div className="wrap">
            <div className="mb-10 flex items-end justify-between gap-6">
              <h2 id="related-h" className="headline text-[clamp(1.75rem,3.5vw,2.5rem)]">
                More {def.label.toLowerCase()}
              </h2>
              <Link to={back} className="hidden items-center gap-0.5 text-[0.9375rem] text-brand hover:underline sm:inline-flex">
                View all <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(0, 3).map((r) => {
                const im = r.data.image as ImageRef | undefined;
                return (
                  <li key={r.id}>
                    <Link to={`/${def.publicPath}/${r.slug}`} className="group block">
                      <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-white">
                        {im && <Img image={im} sizes="30vw" fit="contain" className="transition-transform duration-700 group-hover:scale-[1.02]" />}
                      </div>
                      <h3 className="mt-4 text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] group-hover:text-brand">{r.title}</h3>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
