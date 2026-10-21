import { expect, test } from "@playwright/test";

test.describe("mobile navigation", () => {
  test("menu opens as a dialog, expands sub-menus, navigates and closes", async ({ page }) => {
    await page.goto("/");
    const open = page.getByRole("button", { name: "Open menu" });
    await expect(open).toBeVisible();
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Site menu" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "About Us" }).click();
    await dialog.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(dialog).toBeHidden();
  });

  test("Escape closes the menu and returns focus", async ({ page }) => {
    await page.goto("/about");
    const open = page.getByRole("button", { name: "Open menu" });
    await open.click();
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("touch targets in the header are at least 44px", async ({ page }) => {
    await page.goto("/");
    const box = await page.getByRole("button", { name: "Open menu" }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("desktop navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test("dropdowns work with the keyboard", async ({ page }) => {
    await page.goto("/");
    const about = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "About Us" });
    await about.focus();
    await page.keyboard.press("Enter");
    await expect(about).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Reports" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(about).toHaveAttribute("aria-expanded", "false");
  });
});
