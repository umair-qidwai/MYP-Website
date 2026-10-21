/**
 * Visual QA: capture screenshots of pages at several viewport widths.
 * Usage: npx tsx scripts/qa/screens.ts --base=http://localhost:5180 --paths=/,/team --widths=1440,390 [--full] [--wait=1500]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args: Record<string, string> = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "true"]; }));
const base = (args.base ?? "http://localhost:5180").replace(/\/$/, "");
const paths = (args.paths ?? "/").split(",");
const widths = (args.widths ?? "1440,390").split(",").map(Number);
const out = args.out ?? "qa/screens";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: args.reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    if (args.full) {
      // scroll through to trigger in-view animations and lazy images
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
    }
    await page.waitForTimeout(Number(args.wait ?? 1500));
    const name = `${(p.replace(/^\//, "").replace(/[/?=&]/g, "_") || "home")}-${w}`;
    if (args.full) {
      await page.evaluate(() => {
        document.body.style.overflowX = "visible"; // Playwright misreads overflow-x: clip
        document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager"));
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!args.full });
    if (args.full) await page.evaluate(() => (document.body.style.overflowX = ""));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`${name}: ${overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px ` : ""}${errors.length ? "errors: " + errors.join(" | ").slice(0, 400) : "ok"}`);
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
