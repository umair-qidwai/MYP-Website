import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("requestfailed", (r) => console.log("FAILED", r.url().slice(0, 140), r.failure()?.errorText));
p.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 200)));
await p.goto("http://localhost:5180/contacts", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
for (const f of p.frames()) console.log("FRAME", f.url().slice(0, 100), (await f.evaluate(() => document.body?.innerText?.slice(0, 200)).catch(() => "n/a")));
await b.close();
