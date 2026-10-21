import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5180/", { waitUntil: "networkidle" });
const secs = await p.$$("main section");
for (const i of [6, 7]) {
  await secs[i].scrollIntoViewIfNeeded();
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `qa/screens/sec-${i}.png` });
  console.log(i, await secs[i].evaluate((s) => { const im = s.querySelector("img"); return im ? { src: im.src.slice(-60), complete: im.complete, nw: im.naturalWidth, op: getComputedStyle(im).opacity, cls: im.className.slice(0, 80) } : s.querySelector("p")?.outerHTML.slice(0, 400); }));
}
await b.close();
