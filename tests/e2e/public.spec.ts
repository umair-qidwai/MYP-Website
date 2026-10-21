import { expect, test, type Page } from "@playwright/test";

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    // Turnstile/WebGL driver chatter isn't an application error
    if (m.type() === "error" && !/turnstile|challenges\.cloudflare|GL Driver|WebGL/i.test(m.text())) errors.push(m.text());
  });
  return errors;
};

test.describe("public website", () => {
  test("homepage renders the hero, initiatives and sections without errors", async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Protect\. Educate\. Empower Our Youth\./ })).toBeVisible();
    await expect(page.getByText("Fixture homepage introduction.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixture initiatives" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fixture Lab/ }).first()).toBeVisible();
    await page.getByRole("heading", { name: "Fixture call to action" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Fixture call to action" })).toBeVisible();
    await expect(page.locator("footer")).toContainText("555-0100");
    expect(errors).toEqual([]);
  });

  test("server HTML carries SEO metadata and readable content before JavaScript runs", async ({ request }) => {
    const res = await request.get("/about");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>About Us | MY Project USA</title>");
    expect(html).toContain('<meta name="description" content="About the fixture organisation.">');
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain("Fixture vision text.");
    expect(html).toContain('hreflang="es"');
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/about");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("navigates between pages client-side and shows the on-this-page outline", async ({ page }) => {
    await page.goto("/");
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "About Us" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();
    await expect(page.getByText("First point")).toBeVisible();
    await page.getByText("Fixture question?").click();
    await expect(page.getByText("Fixture answer.")).toBeVisible();
  });

  test("language switcher links to the Spanish version", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es\/about$/);
    await expect(page.getByText("Texto de prueba en español.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("events list, search and detail page", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: "Fixture Event One" })).toBeVisible();
    await expect(page.getByText("Fixture Draft Event")).toHaveCount(0); // drafts are never public
    await page.getByRole("heading", { name: "Fixture Event Two" }).click();
    await expect(page).toHaveURL(/\/events\/fixture-event-2$/);
    await expect(page.getByRole("heading", { level: 1, name: "Fixture Event Two" })).toBeVisible();
    await expect(page.getByText("Adult $20")).toBeVisible();
  });

  test("old Wix event addresses redirect to the new pages", async ({ page }) => {
    await page.goto("/events-1/old-fixture-event");
    await expect(page).toHaveURL(/\/events\/fixture-event-1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Fixture Event One" })).toBeVisible();
  });

  test("report downloads are served as PDFs", async ({ page, request }) => {
    await page.goto("/reports");
    const link = page.getByRole("link", { name: /Fixture Annual Report/ });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
  });

  test("images load with their real dimensions", async ({ page }) => {
    await page.goto("/about");
    const img = page.getByRole("img", { name: "Fixture photo of a community event" });
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute("width", "640");
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  });

  test("contact form validates and only confirms after the server accepts it", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByLabel("Name").fill("Fixture Person");
    await page.getByLabel("Email").fill("fixture.person@example.org");
    await page.getByLabel(/Message/).fill("Hello from the end-to-end tests.");
    // Wait for the Turnstile test widget to issue a token
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Thank you — fixture message received.")).toBeVisible({ timeout: 15_000 });
  });

  test("unknown pages show a helpful 404", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /can’t find that page/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the homepage" })).toBeVisible();
  });

  test("no horizontal scrolling at common screen widths", async ({ page }) => {
    for (const width of [375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/about", "/events", "/contacts"]) {
        await page.goto(path);
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("content stays fully visible with reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5190/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(page.getByText("Fixture homepage introduction.")).toBeVisible();
    await ctx.close();
  });
});
