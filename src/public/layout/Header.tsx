import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import type { NavItem } from "@shared/settings";
import { useSite } from "../SiteContext";
import { SmartLink } from "../components/SmartLink";
import { SocialIcon, SOCIAL_LABEL } from "../components/SocialIcon";
import { MosaicBars } from "../components/Reveal";

/** Wordmark: the organisation's own logo artwork + name. */
export function Brand({ onDark = false }: { onDark?: boolean }) {
  const { settings } = useSite();
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label={`${settings.site.name} — home`}>
      {settings.site.logo ? (
        <span className="relative block size-11 shrink-0 overflow-hidden rounded-[10px] bg-white ring-1 ring-ink/10 transition-transform duration-500 group-hover:-rotate-3">
          <img src={settings.site.logo.src} alt="" width={44} height={44} className="h-full w-full object-cover" />
        </span>
      ) : null}
      <span className={`display text-[1.32rem] leading-none tracking-[-0.03em] ${onDark ? "text-paper" : "text-ink"}`} style={{ fontStretch: "86%" }}>
        MY Project <span className="serif-accent text-[1.1em] font-normal">USA</span>
      </span>
    </Link>
  );
}

function titleCase(label: string) {
  // Original Wix menu labels are typed in capitals; present them in a calmer case for reading.
  // "MY" (Muslim Youth) and "USA" stay capitalised.
  if (label !== label.toUpperCase()) return label;
  return label
    .split(" ")
    .map((w) => (["MY", "USA", "MYP"].includes(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

function DesktopItem({ item, open, onOpen, onClose }: { item: NavItem; open: boolean; onOpen: () => void; onClose: () => void }) {
  const id = useId();
  const location = useLocation();
  const active = item.href && item.href !== "/" && location.pathname.startsWith(item.href);
  const childActive = item.children.some((c) => c.href && location.pathname === c.href);
  const cls = `relative inline-flex items-center gap-1 rounded-full px-3 py-2 text-[0.93rem] font-medium transition-colors hover:bg-ink/[0.06] ${active || childActive ? "text-plum" : "text-ink"}`;
  if (!item.children.length) {
    return item.href ? (
      <SmartLink href={item.href} className={cls} aria-current={location.pathname === item.href ? "page" : undefined}>
        {titleCase(item.label)}
      </SmartLink>
    ) : null;
  }
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        className={cls}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        {titleCase(item.label)}
        <ChevronDown aria-hidden className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          >
            <div className="overflow-hidden rounded-2xl bg-paper shadow-[0_30px_60px_-20px_rgb(25_22_19/0.35)] ring-1 ring-ink/10">
              <MosaicBars className="!h-1" />
              <ul className="p-2">
                {item.href && (
                  <li>
                    <SmartLink href={item.href} className="flex items-center justify-between rounded-xl px-4 py-3 text-[0.95rem] font-semibold hover:bg-ink/[0.05]" onClick={onClose}>
                      {titleCase(item.label)} overview
                    </SmartLink>
                  </li>
                )}
                {item.children.map((c) => (
                  <li key={c.label}>
                    <SmartLink
                      href={c.href || "/"}
                      className={`group flex items-center justify-between rounded-xl px-4 py-2.5 text-[0.95rem] hover:bg-ink/[0.05] ${location.pathname === c.href ? "text-plum" : ""}`}
                      onClick={onClose}
                      aria-current={location.pathname === c.href ? "page" : undefined}
                    >
                      {titleCase(c.label)}
                      <ArrowUpRight aria-hidden className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
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
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpenIdx(null);
    setMenuOpen(false);
  }, [location.pathname]);

  const donate = settings.quickLinks.buttons.find((b) => /donate/i.test(b.label));
  // "Subscribe" appears both in the menu and as a quick action on the original site; keep it in the menu.
  const nav = settings.navigation.main.filter((n) => n.label.toUpperCase() !== "HOME");

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500 ${scrolled ? "bg-paper/92 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md" : "bg-paper"}`}
        style={{ height: "var(--header-h)" }}
      >
        <div className="wrap flex h-full items-center justify-between gap-6">
          <Brand />
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-0.5">
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
          <div className="flex items-center gap-2">
            {donate && (
              <SmartLink
                href={donate.href}
                className="hidden min-h-11 items-center gap-2 rounded-full bg-plum px-5 text-[0.93rem] font-semibold text-white transition-colors hover:bg-plum-deep sm:inline-flex"
              >
                {donate.label}
                <span aria-hidden className="inline-block size-1.5 rounded-full bg-saffron" />
              </SmartLink>
            )}
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 transition-colors hover:bg-ink/5 xl:hidden"
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
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button, a")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a, button")].filter((x) => !x.hasAttribute("disabled"));
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
        <motion.div
          id="mobile-menu"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink text-paper"
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.6, ease: [0.83, 0, 0.17, 1] }}
        >
          <MosaicBars />
          <div className="wrap flex items-center justify-between" style={{ height: "var(--header-h)" }}>
            <Brand onDark />
            <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-paper/25 hover:bg-white/10" aria-label="Close menu">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile" className="wrap flex-1 pb-8 pt-4">
            <ul className="divide-y divide-paper/10 border-y border-paper/10">
              {[{ label: "Home", href: "/", children: [] } as NavItem, ...nav].map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {item.children.length ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-4 text-left"
                        aria-expanded={expanded === item.label}
                        onClick={() => setExpanded((v) => (v === item.label ? null : item.label))}
                      >
                        <span className="display text-[2rem] font-semibold">{titleCase(item.label)}</span>
                        <ChevronDown aria-hidden className={`size-6 transition-transform ${expanded === item.label ? "rotate-180" : ""}`} />
                      </button>
                      {expanded === item.label && (
                        <ul className="grid gap-1 pb-5 pl-1">
                          {item.href && (
                            <li>
                              <SmartLink href={item.href} onClick={onClose} className="block py-1.5 text-lg text-paper/80 hover:text-white">
                                Overview
                              </SmartLink>
                            </li>
                          )}
                          {item.children.map((c) => (
                            <li key={c.label}>
                              <SmartLink href={c.href || "/"} onClick={onClose} className="block py-1.5 text-lg text-paper/80 hover:text-white">
                                {titleCase(c.label)}
                              </SmartLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <SmartLink href={item.href || "/"} onClick={onClose} className="block py-4">
                      <span className="display text-[2rem] font-semibold">{titleCase(item.label)}</span>
                    </SmartLink>
                  )}
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2">
              {settings.quickLinks.buttons.map((b) => (
                <SmartLink key={b.label} href={b.href} onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-paper/25 hover:bg-paper hover:text-ink">
                  {b.label}
                </SmartLink>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              {settings.social.links.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-full ring-1 ring-paper/20 hover:bg-paper hover:text-ink" aria-label={SOCIAL_LABEL[s.platform]}>
                  <SocialIcon platform={s.platform} className="size-[1.1rem]" />
                </a>
              ))}
            </div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
