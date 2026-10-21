/** Shared geometry for the hero sculpture (used by both the WebGL scene and the CSS fallback). */
export const PALETTE = ["#cf5532", "#eaa53a", "#5a8a35", "#1c7672", "#2e6cb2", "#4f2d82", "#c23e66"];

export type Bar = { angle: number; height: number; color: string; depth: number };

/** A fan of bars rising from an arc — the "many hands, many colours" motif of the MY Project USA logo. */
export function makeBars(count: number): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1); // 0..1
    const centred = t * 2 - 1; // -1..1
    const angle = centred * 0.95; // radians across the fan
    // Tallest in the middle, with a gentle irregular rhythm so it feels hand-made
    const height = 1.7 + Math.cos(centred * 1.45) * 2.4 + Math.sin(i * 2.3) * 0.35;
    bars.push({ angle, height, color: PALETTE[i % PALETTE.length], depth: (i % 3) * 0.18 - 0.18 });
  }
  return bars;
}
