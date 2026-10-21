import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
p.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().slice(0, 160)); });
p.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 500)));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.type(), m.text().slice(0, 300)); });
await p.goto(process.argv[2] ?? "http://localhost:5180/", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
console.log("root children:", await p.evaluate(() => document.getElementById("root")?.firstElementChild?.className));
await b.close();
