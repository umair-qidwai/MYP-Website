import { Link } from "react-router";
import { useSite } from "../SiteContext";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { navLabel } from "./Header";

export function Footer() {
  const { settings } = useSite();
  const { contact } = settings;
  const nav = settings.navigation.main.filter((n) => n.label.toUpperCase() !== "HOME");

  return (
    <footer className="bg-mist text-[0.8125rem] leading-relaxed text-muted" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Site footer
      </h2>
      <div className="wrap py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="text-[0.9375rem] font-semibold text-ink">{settings.site.name}</p>
            {settings.site.tagline && <p className="mt-1">{settings.site.tagline}</p>}
            <address className="mt-5 space-y-1 not-italic">
              {contact.visitAddress && <p>{contact.visitAddress}</p>}
              {contact.mailAddress && contact.mailAddress !== contact.visitAddress && <p>Mail: {contact.mailAddress}</p>}
              {contact.phone && (
                <p>
                  <a className="hover:text-ink" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                    {contact.phone}
                  </a>
                </p>
              )}
              {contact.email && (
                <p>
                  <a className="hover:text-ink" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.taxId && <p>Tax Exempt ID: {contact.taxId}</p>}
            </address>
            <ul className="mt-6 flex gap-2">
              {settings.social.links.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${SOCIAL_LABEL[s.platform]} (opens in a new tab)`}
                    className="grid size-9 place-items-center rounded-full bg-white text-ink-2 ring-1 ring-black/5 transition-colors hover:text-ink"
                  >
                    <SocialIcon platform={s.platform} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:col-span-8 lg:grid-cols-4">
            {nav.map((n) => (
              <div key={n.label}>
                <p className="mb-2.5 font-semibold text-ink">{navLabel(n.label)}</p>
                <ul className="space-y-2">
                  {n.href && n.children.length > 0 && (
                    <li>
                      <SmartLink href={n.href} className="hover:text-ink hover:underline">
                        Overview
                      </SmartLink>
                    </li>
                  )}
                  {(n.children.length ? n.children : n.href ? [{ label: n.label, href: n.href }] : []).map((c) => (
                    <li key={c.label}>
                      <SmartLink href={c.href || "/"} className="hover:text-ink hover:underline">
                        {navLabel(c.label)}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>{contact.copyright}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {settings.quickLinks.buttons.map((b) => (
              <SmartLink key={b.label} href={b.href} className="hover:text-ink hover:underline">
                {b.label}
              </SmartLink>
            ))}
            <Link to="/admin/" rel="nofollow" className="hover:text-ink hover:underline">
              Staff sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
