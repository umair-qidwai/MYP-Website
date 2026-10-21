/**
 * Server-rendered HTML snapshot for search engines, link previews and no-JS visitors.
 * React replaces this markup on load. Rendering is plain string building from validated
 * content (no React on the server), keeping CPU time far below the Workers free-tier limit.
 */
import type { Block, PageDoc } from "@shared/blocks";
import { getCollection } from "@shared/collections";
import { escapeHtml as e, richToHtml, richToText, type RichDoc } from "@shared/richtext";
import type { Settings } from "@shared/settings";
import type { PublicEntry, PublicPagePayload } from "@shared/types";

export type Head = { title: string; description: string; canonical: string; image?: string; type: string; noindex: boolean; jsonLd: object[] };

const attr = (s: string | undefined) => e(s ?? "");
const abs = (base: string, src?: string) => (!src ? undefined : src.startsWith("http") ? src : base.replace(/\/$/, "") + src);

function blockHtml(b: Block, collections: Record<string, PublicEntry[]>, settings: Settings): string {
  switch (b.type) {
    case "hero":
      return `<header class="ssr-hero"><h1>${e(b.heading)}</h1>${richToHtml(b.body)}${buttons(b.buttons)}</header>`;
    case "richText":
      return `<section class="ssr-prose">${richToHtml(b.doc)}</section>`;
    case "statement":
      return `<section><p class="ssr-lead">${e(b.text)}</p></section>`;
    case "image":
      return `<figure>${img(b.image.src, b.image.alt)}${b.caption ? `<figcaption>${e(b.caption)}</figcaption>` : ""}</figure>`;
    case "gallery":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ul>${b.images.map((i) => `<li>${link(i.link, img(i.image.src, i.image.alt))}${i.caption ? ` ${e(i.caption)}` : ""}</li>`).join("")}</ul></section>`;
    case "split":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}${b.image ? img(b.image.src, b.image.alt) : ""}${richToHtml(b.doc)}${buttons(b.buttons)}</section>`;
    case "cards":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}${b.intro ? `<p>${e(b.intro)}</p>` : ""}<ul>${b.items
        .map(
          (i) =>
            `<li>${i.image ? img(i.image.src, i.image.alt) : ""}${i.title ? `<h3>${link(i.link, e(i.title))}</h3>` : ""}${i.text ? `<p>${e(i.text)}</p>` : ""}</li>`,
        )
        .join("")}</ul></section>`;
    case "options":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}${b.intro ? `<p>${e(b.intro)}</p>` : ""}${b.items
        .map(
          (i) =>
            `<article>${i.eyebrow ? `<p>${e(i.eyebrow)}</p>` : ""}${i.title ? `<h3>${e(i.title)}</h3>` : ""}${richToHtml(i.doc)}${buttons(i.buttons)}</article>`,
        )
        .join("")}</section>`;
    case "stats":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<dl>${b.items.map((i) => `<dt>${e(i.value)}</dt><dd>${e(i.label)}${i.note ? ` — ${e(i.note)}` : ""}</dd>`).join("")}</dl>${b.source ? `<p>${e(b.source)}</p>` : ""}</section>`;
    case "accordion":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}${b.items.map((i) => `<details><summary>${e(i.title)}</summary>${richToHtml(i.doc)}</details>`).join("")}</section>`;
    case "cta":
      return `<section><h2>${e(b.heading)}</h2>${b.text ? `<p>${e(b.text)}</p>` : ""}${buttons(b.buttons)}</section>`;
    case "quote":
      return `<blockquote><p>${e(b.text)}</p>${b.attribution ? `<cite>${e(b.attribution)}</cite>` : ""}</blockquote>`;
    case "timeline":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ol>${b.items.map((i) => `<li><strong>${e(i.date)}</strong> ${e(i.title)}${i.text ? ` — ${e(i.text)}` : ""}</li>`).join("")}</ol></section>`;
    case "downloads":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ul>${b.items.map((i) => `<li>${link(i.file?.url ?? i.url, e(i.title))}${i.description ? ` — ${e(i.description)}` : ""}</li>`).join("")}</ul></section>`;
    case "embed":
      return `<p><a href="${attr(b.url)}" rel="noopener">${e(b.title)}</a></p>`;
    case "buttons":
      return buttons(b.buttons);
    case "programs":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ul>${settings.programs.items.map((p) => `<li>${link(p.href, e(p.name))}</li>`).join("")}</ul></section>`;
    case "social":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ul>${settings.social.links.map((l) => `<li><a href="${attr(l.url)}" rel="noopener">${e(l.platform)}</a></li>`).join("")}</ul></section>`;
    case "video":
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}${b.videos.map((v) => `<video controls preload="none" src="${attr(v.file.url)}"></video>${v.caption ? `<p>${e(v.caption)}</p>` : ""}`).join("")}</section>`;
    case "collection": {
      const def = getCollection(b.collection);
      const items = (collections[b.collection] ?? []).slice(0, b.limit);
      return `<section>${b.heading ? `<h2>${e(b.heading)}</h2>` : ""}<ul>${items
        .map(
          (it) =>
            `<li>${def?.publicPath ? `<a href="/${def.publicPath}/${attr(it.slug)}">${e(it.title)}</a>` : link(String(it.data.url ?? ""), e(it.title))}</li>`,
        )
        .join("")}</ul></section>`;
    }
    case "form":
      return `<section><h2>${e(b.title)}</h2>${b.intro ? `<p>${e(b.intro)}</p>` : ""}<p>This form requires JavaScript.</p></section>`;
  }
}

const img = (src: string, alt: string) => `<img src="${attr(src)}" alt="${attr(alt)}" loading="lazy">`;
const link = (href: string | undefined, inner: string) => (href ? `<a href="${attr(href)}">${inner}</a>` : inner);
const buttons = (bs: { label: string; href: string }[]) =>
  bs.length ? `<p>${bs.map((b) => `<a href="${attr(b.href)}">${e(b.label)}</a>`).join(" · ")}</p>` : "";

function navHtml(settings: Settings): string {
  return `<nav aria-label="Main"><ul>${settings.navigation.main
    .map(
      (n) =>
        `<li>${link(n.href, e(n.label))}${n.children.length ? `<ul>${n.children.map((c) => `<li>${link(c.href, e(c.label))}</li>`).join("")}</ul>` : ""}</li>`,
    )
    .join("")}</ul></nav>`;
}

function footerHtml(s: Settings): string {
  const c = s.contact;
  return `<footer><p>${e(s.site.name)}</p><p>${[
    c.phone && `Call Us: ${c.phone}`,
    c.visitAddress && `Visit Us: ${c.visitAddress}`,
    c.email && `Email Us: ${c.email}`,
    c.taxId && `Tax Exempt ID: ${c.taxId}`,
  ]
    .filter(Boolean)
    .map((x) => e(x as string))
    .join("<br>")}</p></footer>`;
}

export function renderSnapshot(payload: PublicPagePayload, settings: Settings): string {
  let main: string;
  if (payload.kind === "page") {
    const p = payload.page;
    const hasHero = p.blocks[0]?.type === "hero";
    main = `${hasHero || p.hideTitle ? "" : `<h1>${e(p.title)}</h1>`}${p.blocks.map((b) => blockHtml(b, payload.collections, settings)).join("")}`;
  } else if (payload.kind === "entry") {
    const d = payload.entry.data;
    main = `<article><h1>${e(payload.entry.title)}</h1>${d.date ? `<p><time datetime="${attr(String(d.date))}">${e(String(d.date))}</time></p>` : ""}${d.summary ? `<p>${e(String(d.summary))}</p>` : ""}${richToHtml(d.body as RichDoc | undefined)}</article>`;
  } else {
    main = `<h1>Page not found</h1><p>Sorry, we couldn't find that page.</p><p><a href="/">Go to the homepage</a></p>`;
  }
  return `<div class="ssr">${navHtml(settings)}<main id="main">${main}</main>${footerHtml(settings)}</div>`;
}

function excerpt(s: string, n = 180) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
}

function firstImage(page: PageDoc): string | undefined {
  for (const b of page.blocks) {
    if (b.type === "hero" && b.image) return b.image.src;
    if (b.type === "image") return b.image.src;
    if (b.type === "split" && b.image) return b.image.src;
    if (b.type === "gallery" && b.images[0]) return b.images[0].image.src;
  }
}

export function buildHead(payload: PublicPagePayload, settings: Settings, siteUrl: string): Head {
  const base = siteUrl.replace(/\/$/, "");
  const canonical = `${base}/${payload.path}`.replace(/\/$/, "") || base;
  const siteName = settings.site.name;
  const org = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: siteName,
    url: base,
    telephone: settings.contact.phone || undefined,
    email: settings.contact.email || undefined,
    address: settings.contact.visitAddress || undefined,
    sameAs: settings.social.links.map((l) => l.url),
  };
  if (payload.kind === "page") {
    const p = payload.page;
    const firstText =
      p.blocks.map((b) => (b.type === "richText" ? richToText(b.doc) : b.type === "hero" ? richToText(b.body) : "")).find((t) => t.length > 40) ?? "";
    const title = p.seo.title || (payload.path === "" ? siteName : `${p.title} | ${siteName}`);
    return {
      title,
      description: p.seo.description || excerpt(firstText) || settings.site.description,
      canonical,
      image: abs(base, p.seo.image?.src ?? firstImage(p) ?? settings.site.ogImage?.src),
      type: "website",
      noindex: !!p.seo.noindex || !!payload.preview,
      jsonLd: payload.path === "" ? [org] : [],
    };
  }
  if (payload.kind === "entry") {
    const en = payload.entry;
    const def = getCollection(payload.collection);
    const img = (en.data.image as { src?: string } | undefined)?.src;
    const desc = en.seo?.description || String(en.data.summary ?? "") || excerpt(richToText(en.data.body as RichDoc | undefined)) || settings.site.description;
    const ld: object[] = [];
    if (payload.collection === "events") {
      ld.push({
        "@context": "https://schema.org",
        "@type": "Event",
        name: en.title,
        startDate: en.data.date || undefined,
        location: en.data.location ? { "@type": "Place", name: en.data.location } : undefined,
        image: abs(base, img),
        organizer: { "@type": "Organization", name: siteName, url: base },
      });
    } else if (payload.collection === "articles") {
      ld.push({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: en.title,
        datePublished: en.data.date || undefined,
        image: abs(base, img),
        author: en.data.author ? { "@type": "Person", name: en.data.author } : undefined,
      });
    }
    return {
      title: `${en.title} | ${def?.label ?? ""} | ${siteName}`,
      description: excerpt(desc),
      canonical,
      image: abs(base, img ?? settings.site.ogImage?.src),
      type: "article",
      noindex: !!payload.preview,
      jsonLd: ld,
    };
  }
  return { title: `Page not found | ${siteName}`, description: settings.site.description, canonical, type: "website", noindex: true, jsonLd: [] };
}
