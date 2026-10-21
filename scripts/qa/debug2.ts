import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5180/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
console.log(await p.evaluate(() => [...document.querySelectorAll("#hero-title > span > span")].map((s) => ({ html: s.innerHTML.slice(0, 200), rect: JSON.stringify(s.getBoundingClientRect()), tr: getComputedStyle(s.firstElementChild!).transform }))));
await b.close();
