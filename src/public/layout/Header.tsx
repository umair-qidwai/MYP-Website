import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavItem } from "@shared/settings";
import { useSite } from "../SiteContext";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";

/** Menu labels were typed in capitals on Wix; show them in a calmer case ("MY" and "USA" stay). */
export function navLabel(label: string) {
  if (label !== label.toUpperCase()) return label;
  return label
    .split(" ")
    .map((w) => (["MY", "USA", "MYP"].includes(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

export function Brand() {
  const { settings } = useSite();
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${settings.site.name} — home`}>
      {settings.site.logo && <img src={settings.site.logo.src} alt="" width={32} height={32} className="size-8 object-contain mix-blend-multiply" />}
      <span className="max-w-[4.5rem] text-sm font-semibold leading-tight tracking-[-0.015em] text-ink max-[360px]:hidden sm:max-w-none sm:text-[0.9375rem]">
        {settings.site.name}
      </span>
    </Link>
  );
}

function DesktopItem({ item, open, onOpen, onClose }: { item: NavItem; open: boolean; onOpen: () => void; onClose: () => void }) {
  const id = useId();
  const location = useLocation();
  const active = (item.href && location.pathname === item.href) || item.children.some((c) => c.href === location.pathname);
  const cls = `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.875rem] transition-colors ${active ? "text-ink font-medium" : "text-ink-2 hover:text-ink"}`;
  if (!item.children.length) {
    return item.href ? (
      <SmartLink href={item.href} className={cls} aria-current={location.pathname === item.href ? "page" : undefined}>
        {navLabel(item.label)}
      </SmartLink>
    ) : null;
  }
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClose();
      }}
    >
      <button
        type="button"
        className={cls}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        {navLabel(item.label)}
        <ChevronDown aria-hidden className={`size-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          >
            <ul className="rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5 backdrop-blur-xl">
              {item.href && (
                <li>
                  <SmartLink href={item.href} onClick={onClose} className="block rounded-xl px-3.5 py-2.5 text-[0.875rem] font-medium text-ink hover:bg-mist">
                    {navLabel(item.label)}
                  </SmartLink>
                </li>
              )}
              {item.children.map((c) => (
                <li key={c.label}>
                  <SmartLink
                    href={c.href || "/"}
                    onClick={onClose}
                    aria-current={location.pathname === c.href ? "page" : undefined}
                    className="block rounded-xl px-3.5 py-2.5 text-[0.875rem] text-ink-2 hover:bg-mist hover:text-ink"
                  >
                    {navLabel(c.label)}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const { settings } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpenIdx(null);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  const donate = settings.quickLinks.buttons.find((b) => /donate/i.test(b.label));
  const nav = settings.navigation.main.filter((n) => n.label.toUpperCase() !== "HOME");

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-4">
        <div
          className={`mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-1 rounded-full pl-4 pr-2 ring-1 backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-300 sm:gap-2 sm:pl-5 ${
            scrolled ? "bg-white/80 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)] ring-black/[0.06]" : "bg-white/70 ring-black/[0.04]"
          }`}
        >
          <Brand />
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center">
              {nav.map((item, i) => (
                <li key={item.label}>
                  <DesktopItem
                    item={item}
                    open={openIdx === i}
                    onOpen={() => {
                      window.clearTimeout(closeTimer.current);
                      setOpenIdx(i);
                    }}
                    onClose={() => {
                      closeTimer.current = window.setTimeout(() => setOpenIdx((v) => (v === i ? null : v)), 120);
                    }}
                  />
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1.5">
            <SmartLink
              href="/services"
              className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand-soft px-3 text-sm font-medium text-brand transition-colors hover:bg-brand/15 sm:px-4"
            >
              Get Help
            </SmartLink>
            {donate && (
              <SmartLink
                href={donate.href}
                className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-3 text-[0.875rem] font-medium text-white transition-colors hover:bg-brand-deep sm:px-4"
              >
                {donate.label}
              </SmartLink>
            )}
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 xl:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} />
    </>
  );
}

function MobileMenu({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: NavItem[] }) {
  const { settings } = useSite();
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    document.documentElement.style.overflow = "hidden";
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button, a")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a, button")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-menu"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 overflow-y-auto bg-white/96 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          <div className="flex h-[4.75rem] items-center justify-between px-7 pt-3">
            <Brand />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile" className="px-7 pb-12 pt-4">
            <div className="mb-6 flex flex-wrap gap-2" aria-label="Quick actions">
              <SmartLink
                href="/services"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 py-2.5 text-base font-medium text-white"
              >
                Get Help
              </SmartLink>
              <SmartLink
                href="/volunteer"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-mist px-5 py-2.5 text-base font-medium text-ink"
              >
                Volunteer
              </SmartLink>
              <SmartLink
                href={settings.quickLinks.buttons.find((b) => /donate/i.test(b.label))?.href || "/donate"}
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-brand-soft px-5 py-2.5 text-base font-medium text-brand"
              >
                Donate
              </SmartLink>
            </div>
            <ul>
              {[{ label: "Home", href: "/", children: [] } as NavItem, ...nav].map((item, i) => (
                <m.li
                  key={item.label}
                  className="border-b border-line"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.03, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {item.children.length ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-4 text-left text-[1.375rem] font-semibold tracking-[-0.02em]"
                        aria-expanded={expanded === item.label}
                        onClick={() => setExpanded((v) => (v === item.label ? null : item.label))}
                      >
                        {navLabel(item.label)}
                        <ChevronDown aria-hidden className={`size-5 text-muted transition-transform ${expanded === item.label ? "rotate-180" : ""}`} />
                      </button>
                      {expanded === item.label && (
                        <ul className="pb-4">
                          {item.href && (
                            <li>
                              <SmartLink href={item.href} onClick={onClose} className="block py-2 text-[1.0625rem] text-ink-2">
                                Overview
                              </SmartLink>
                            </li>
                          )}
                          {item.children.map((c) => (
                            <li key={c.label}>
                              <SmartLink href={c.href || "/"} onClick={onClose} className="block py-2 text-[1.0625rem] text-ink-2">
                                {navLabel(c.label)}
                              </SmartLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <SmartLink href={item.href || "/"} onClick={onClose} className="block py-4 text-[1.375rem] font-semibold tracking-[-0.02em]">
                      {navLabel(item.label)}
                    </SmartLink>
                  )}
                </m.li>
              ))}
            </ul>
            <div className="mt-8 flex gap-2">
              {settings.social.links.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-11 place-items-center rounded-full bg-mist text-ink-2 hover:text-ink"
                  aria-label={SOCIAL_LABEL[s.platform]}
                >
                  <SocialIcon platform={s.platform} className="size-[1.05rem]" />
                </a>
              ))}
            </div>
          </nav>
        </m.div>
      )}
    </AnimatePresence>
  );
}
