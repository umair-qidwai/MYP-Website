import { makeBars } from "./sculpture";

/**
 * Lightweight CSS rendering of the hero sculpture. Shown while the 3D scene loads, and as the
 * permanent fallback when WebGL is unavailable — so the hero is always complete.
 */
export function CssSculpture({ className = "" }: { className?: string }) {
  const bars = makeBars(11);
  const R = 31; // % of container width
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute inset-x-[6%] bottom-[14%] top-[10%]">
        {bars.map((b, i) => {
          const x = 50 + Math.sin(b.angle) * R;
          const lift = (1 - Math.cos(b.angle)) * R * 0.55;
          const h = (b.height / 4.3) * 62;
          return (
            <span
              key={i}
              className="absolute block w-[6.2%] rounded-[1.1vw] shadow-[inset_-0.5vw_0_0_rgb(0_0_0/0.14),inset_0.25vw_0_0_rgb(255_255_255/0.22)]"
              style={{
                left: `${x}%`,
                bottom: `${12 + lift}%`,
                height: `${h}%`,
                background: `linear-gradient(160deg, color-mix(in srgb, ${b.color} 82%, white) 0%, ${b.color} 45%, color-mix(in srgb, ${b.color} 78%, black) 100%)`,
                transform: `translateX(-50%) rotate(${(b.angle * 0.42 * 180) / Math.PI}deg)`,
                transformOrigin: "50% 100%",
              }}
            />
          );
        })}
        <span className="absolute bottom-[6%] left-[16%] right-[16%] h-[13%] rounded-b-[50%] border-b-[0.9vw] border-ink" style={{ borderBottomWidth: "clamp(5px,0.8vw,12px)" }} />
        <span className="absolute -bottom-[2%] left-[18%] right-[18%] h-[6%] rounded-[50%] bg-[#3b2a1a]/15 blur-xl" />
      </div>
    </div>
  );
}
