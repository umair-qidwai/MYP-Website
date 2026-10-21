import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const issues: string[] = [];
p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) issues.push(m.text().slice(0, 220)); });
p.on("pageerror", (e) => issues.push("PAGEERROR " + String(e).slice(0, 200)));
for (const path of ["/", "/free-clinic", "/fgm", "/contacts", "/events", "/copy-of-news-coverage", "/admin/login"]) {
  await p.goto("http://localhost:5181" + path, { waitUntil: "load" });
  await p.mouse.wheel(0, 3000);
  await p.waitForTimeout(3500);
}
const canvas = await (async () => { await p.goto("http://localhost:5181/", { waitUntil: "load" }); await p.waitForTimeout(4000); return p.locator("canvas").count(); })();
console.log("canvas elements on home:", canvas);
console.log(issues.length ? issues.join("\n") : "no CSP violations or page errors");
await b.close();
