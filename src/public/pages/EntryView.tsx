import { Link } from "react-router";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import type { ImageRef } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import type { RichDoc } from "@shared/richtext";
import type { PublicEntry } from "@shared/types";
import { Img } from "../components/Img";
import { RichText } from "../components/RichText";
import { MaskLines, MosaicBars, Reveal } from "../components/Reveal";
import { Button } from "../components/Button";
import { fmtDate } from "../blocks/Collection";

export function EntryView({ collection, entry, related }: { collection: string; entry: PublicEntry; related: PublicEntry[] }) {
  const def = getCollection(collection);
  const d = entry.data;
  const image = d.image as ImageRef | undefined;
  const back = def?.publicPath ? `/${def.publicPath}` : "/";
  const isEvent = collection === "events";
  const meta = [
    d.date ? { icon: CalendarDays, text: fmtDate(d.date) } : null,
    d.time ? { icon: Clock, text: String(d.time) } : null,
    d.location ? { icon: MapPin, text: String(d.location) } : null,
    d.price ? { icon: Ticket, text: String(d.price) } : null,
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  return (
    <article>
      <header className="grain pb-10 pt-10 md:pt-16">
        <div className="wrap">
          <Link to={back} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> {isEvent ? "All events" : def?.label ?? "Back"}
          </Link>
          {!isEvent && d.date ? <p className="eyebrow mt-10 text-plum">{fmtDate(d.date)}{d.author ? ` · ${d.author}` : ""}</p> : null}
          <h1 className={`display max-w-[20ch] text-[clamp(2.4rem,6.5vw,6rem)] ${isEvent ? "mt-10" : "mt-5"}`}>
            <MaskLines lines={[entry.title]} />
          </h1>
          {meta.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {meta.map((m) => (
                <li key={m.text} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.95rem] ring-1 ring-ink/10">
                  <m.icon aria-hidden className="size-4 text-plum" /> {m.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <div className="wrap grid gap-12 pb-20 md:grid-cols-12">
        {image && (
          <Reveal className={isEvent ? "md:col-span-7" : "md:col-span-10 md:col-start-2"}>
            <div className="overflow-hidden rounded-[26px] bg-paper-2">
              <Img image={image} priority sizes="(min-width: 768px) 60vw, 100vw" className="w-full" />
            </div>
          </Reveal>
        )}
        <div className={isEvent && image ? "md:col-span-5" : "md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3"}>
          {d.summary ? <p className="prose-lead mb-8">{String(d.summary)}</p> : null}
          <RichText doc={d.body as RichDoc | undefined} />
          {d.registerUrl ? <Button href={String(d.registerUrl)} label={String(d.registerLabel || "Register")} className="mt-8" /> : null}
        </div>
      </div>
      {related.length > 0 && def?.publicPath && (
        <section className="tone-sand py-16 md:py-24" aria-labelledby="related-h">
          <div className="wrap">
            <MosaicBars className="mb-8 w-20 overflow-hidden rounded-full" />
            <div className="mb-10 flex items-end justify-between gap-6">
              <h2 id="related-h" className="display text-[clamp(2rem,4vw,3.2rem)]">
                More {def.label.toLowerCase()}
              </h2>
              <Link to={back} className="hidden items-center gap-1.5 font-semibold sm:inline-flex">
                View all <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(0, 3).map((r) => {
                const im = r.data.image as ImageRef | undefined;
                return (
                  <li key={r.id}>
                    <Link to={`/${def.publicPath}/${r.slug}`} className="group block">
                      <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-paper">{im && <Img image={im} sizes="30vw" fit="cover" className="transition-transform duration-700 group-hover:scale-[1.04]" />}</div>
                      <h3 className="mt-4 text-lg font-semibold leading-snug group-hover:text-plum">{r.title}</h3>
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
