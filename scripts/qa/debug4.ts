import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5180/", { waitUntil: "networkidle" });
for (let y = 0; y < 5600; y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(100); }
await p.waitForTimeout(1500);
await p.screenshot({ path: "qa/screens/scroll-check.png" });
console.log(await p.evaluate(() => [...document.querySelectorAll("main section")].slice(6, 9).map((s) => ({ top: Math.round(s.getBoundingClientRect().top), html: s.innerHTML.slice(0, 300) }))));
await b.close();
