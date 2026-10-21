import { useSite } from "../SiteContext";

/**
 * The "All are welcome" mural from the original site header, as a full-width band that drifts slowly
 * sideways (still for visitors who prefer reduced motion). Decorative: the artwork carries no information.
 */
export function MuralRibbon({ className = "", height = "clamp(7rem, 13vw, 12rem)", moving = true }: { className?: string; height?: string; moving?: boolean }) {
  const { settings } = useSite();
  const banner = settings.site.banner;
  if (!banner) return null;
  if (!moving) {
    return (
      <div
        aria-hidden
        className={`w-full bg-repeat-x ${className}`}
        style={{ height, backgroundImage: `url("${banner.src}")`, backgroundSize: "auto 100%", backgroundPosition: "center" }}
      />
    );
  }
  return (
    <div aria-hidden className={`marquee w-full overflow-hidden ${className}`} style={{ height }}>
      <div className="marquee-track flex h-full w-max">
        {Array.from({ length: 6 }, (_, i) => (
          <img key={i} src={banner.src} alt="" className="h-full w-auto max-w-none shrink-0" loading={i < 3 ? "eager" : "lazy"} decoding="async" />
        ))}
      </div>
    </div>
  );
}
