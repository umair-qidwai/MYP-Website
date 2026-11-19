import { expect, test } from "@playwright/test";

test("visitors can find pantry access instructions and request clinic care", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "How can we help you today?" })).toBeVisible();
  await page.getByRole("link", { name: "Get Help", exact: true }).first().click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByText(/Bring your ID on your first visit to register/)).toBeVisible();
  await page.getByRole("link", { name: "Plan Your First Pantry Visit" }).click();
  await expect(page).toHaveURL(/\/services#option-get-help-0$/);
  await expect(page.getByText(/No online application/)).toBeVisible();
  await page.goto("/services");
  await page.getByRole("link", { name: "Request a Clinic Appointment", exact: true }).click();
  await expect(page).toHaveURL(/\/services#section-clinic-request$/);
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toBeVisible();
  await expect(page.getByLabel("Preferred language")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Appointment Request" })).toBeVisible();
});

test("program directory searches, filters and offers a useful empty result", async ({ page }) => {
  await page.goto("/services#section-program-directory");
  const directory = page.locator("#section-program-directory");
  const search = page.getByRole("searchbox", { name: "Search by program or need" });
  await search.fill("clinic");
  await expect(page.getByRole("status")).toHaveText("1 program found");
  await expect(directory.getByRole("heading", { name: "Hilltop Free Clinic", exact: true })).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "Jobs & education", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1 program found");
  await expect(directory.getByRole("heading", { name: "MY Pathways", exact: true })).toBeVisible();
  await search.fill("no-such-program");
  await expect(page.getByRole("status")).toHaveText("0 programs found");
  await expect(directory.getByRole("link", { name: "contact our team", exact: true })).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "All departments", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("13 programs found");
});

test("visitor pages fit mobile, tablet and desktop and mobile actions stay accessible", async ({ page }) => {
  for (const width of [375, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/get-involved", "/about", "/impact", "/news"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "Donate", exact: true }).first()).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Get Help", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Site menu" });
  await expect(menu.getByRole("link", { name: "Get Help", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Volunteer", exact: true })).toBeVisible();
  await menu.getByRole("link", { name: "Get Help", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(menu).toBeHidden();
});
