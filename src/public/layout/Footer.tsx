import { Link } from "react-router";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { useSite } from "../SiteContext";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { Brand } from "./Header";
import { Img } from "../components/Img";

export function Footer() {
  const { settings } = useSite();
  const { contact, programs } = settings;
  const nav = settings.navigation.main.filter((n) => n.label.toUpperCase() !== "HOME");
  const nice = (l: string) =>
    l === l.toUpperCase()
      ? l
          .split(" ")
          .map((w) => (["MY", "USA"].includes(w) ? w : w[0] + w.slice(1).toLowerCase()))
          .join(" ")
      : l;

  return (
    <footer className="on-dark relative mt-0 bg-ink text-paper" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Site footer
      </h2>
      {settings.site.banner && (
        <div className="relative overflow-hidden border-b border-paper/10">
          <Img image={settings.site.banner} className="block h-[clamp(5rem,14vw,11rem)] w-full object-cover object-center" sizes="100vw" />
        </div>
      )}

      {programs.items.length > 0 && (
        <div className="wrap border-b border-paper/10 py-10">
          <p className="eyebrow mb-5 text-paper/60">{programs.heading || "Initiatives"}</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {programs.items.map((p) => (
              <li key={p.name}>
                <SmartLink
                  href={p.href || "/"}
                  className="group block rounded-xl bg-white p-2 transition-transform duration-500 hover:-translate-y-1"
                  aria-label={p.name}
                >
                  {p.image ? (
                    <Img image={p.image} sizes="160px" className="aspect-square w-full object-contain" />
                  ) : (
                    <span className="block p-3 text-sm text-ink">{p.name}</span>
                  )}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="wrap grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Brand onDark />
          {settings.site.tagline && <p className="display mt-8 max-w-md text-[clamp(2rem,3.5vw,3rem)] text-paper">{settings.site.tagline}</p>}
          <ul className="mt-8 space-y-3 text-[0.98rem] text-paper/80">
            {contact.phone && (
              <li className="flex gap-3">
                <Phone aria-hidden className="mt-1 size-4 shrink-0 text-saffron" />
                <span>
                  Call Us:{" "}
                  <a
                    className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {contact.phone}
                  </a>
                </span>
              </li>
            )}
            {contact.visitAddress && (
              <li className="flex gap-3">
                <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-saffron" />
                <span>Visit Us: {contact.visitAddress}</span>
              </li>
            )}
            {contact.mailAddress && (
              <li className="flex gap-3">
                <Mail aria-hidden className="mt-1 size-4 shrink-0 text-saffron" />
                <span>Mail Us: {contact.mailAddress}</span>
              </li>
            )}
            {contact.email && (
              <li className="flex gap-3">
                <Mail aria-hidden className="mt-1 size-4 shrink-0 text-saffron" />
                <span>
                  Email Us:{" "}
                  <a className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </span>
              </li>
            )}
            {contact.taxId && <li className="pl-7 text-paper/60">Tax Exempt ID: {contact.taxId}</li>}
          </ul>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:col-span-7">
          {nav.map((n) => (
            <div key={n.label}>
              <p className="eyebrow mb-3 text-paper/50">{nice(n.label)}</p>
              <ul className="space-y-2 text-[0.97rem]">
                {n.href && (
                  <li>
                    <SmartLink href={n.href} className="text-paper/85 hover:text-white">
                      {n.children.length ? "Overview" : nice(n.label)}
                    </SmartLink>
                  </li>
                )}
                {n.children.map((c) => (
                  <li key={c.label}>
                    <SmartLink href={c.href || "/"} className="text-paper/85 hover:text-white">
                      {nice(c.label)}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="wrap flex flex-col gap-6 border-t border-paper/10 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {settings.quickLinks.buttons.map((b) => (
            <SmartLink
              key={b.label}
              href={b.href}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-paper/20 transition-colors hover:bg-paper hover:text-ink"
            >
              {b.label}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </SmartLink>
          ))}
        </div>
        <ul className="flex gap-2">
          {settings.social.links.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${SOCIAL_LABEL[s.platform]} (opens in a new tab)`}
                className="grid size-10 place-items-center rounded-full ring-1 ring-paper/20 transition-colors hover:bg-paper hover:text-ink"
              >
                <SocialIcon platform={s.platform} className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="wrap flex flex-col gap-2 pb-10 text-sm text-paper/50 sm:flex-row sm:justify-between">
        <p>{contact.copyright}</p>
        <Link to="/admin/" className="hover:text-paper" rel="nofollow">
          Staff sign in
        </Link>
      </div>
    </footer>
  );
}
