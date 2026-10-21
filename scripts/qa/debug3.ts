import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2] ?? "http://localhost:5180/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, bh: document.body.scrollHeight, ov: getComputedStyle(document.documentElement).overflow, bov: getComputedStyle(document.body).overflow, main: document.querySelector("main")?.getBoundingClientRect().height, sections: [...document.querySelectorAll("main section")].map(s => Math.round(s.getBoundingClientRect().height)) })));
await b.close();
