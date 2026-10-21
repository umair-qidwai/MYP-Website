import { chromium } from "playwright";
const [link, pw] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)));
if (link !== "skip") {
  await p.goto(link, { waitUntil: "networkidle" });
  await p.getByLabel("New password").fill(pw);
  await p.getByLabel("Repeat password").fill(pw);
  await p.getByRole("button", { name: "Save password" }).click();
  await p.getByText("You're all set").waitFor();
}
await p.goto("http://localhost:5180/admin/login", { waitUntil: "load" });
await p.waitForTimeout(1500);
await p.screenshot({ path: "qa/screens/admin-login.png" });
await p.getByLabel("Email").fill("qa-admin@example.org");
await p.getByLabel("Password").fill(pw);
await p.waitForTimeout(2500); // turnstile token
await p.getByRole("button", { name: "Sign in" }).click();
await p.getByText(/Good (morning|afternoon|evening)/).waitFor({ timeout: 15000 });
await p.waitForTimeout(800);
await p.screenshot({ path: "qa/screens/admin-dashboard.png" });
for (const [path, name] of [["/admin/pages", "pages"], ["/admin/media", "media"], ["/admin/settings", "settings"], ["/admin/collections/events", "events"]]) {
  await p.goto("http://localhost:5180" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `qa/screens/admin-${name}.png` });
}
await p.goto("http://localhost:5180/admin/pages", { waitUntil: "networkidle" });
await p.getByRole("link", { name: /Homepage/ }).click();
await p.waitForTimeout(3000);
await p.screenshot({ path: "qa/screens/admin-editor.png" });
await b.close();
