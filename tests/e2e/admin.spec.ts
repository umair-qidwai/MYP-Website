import { expect, test, type Page } from "@playwright/test";
import { makePdf, makePng } from "../fixtures/assets";
import { ADMIN, E2E_PASSWORD, EDITOR } from "./fixture";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/admin/login", { waitUntil: "load" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.waitForTimeout(2500); // Turnstile test widget issues its token
  await page.getByRole("button", { name: "Sign in" }).click();
  if (password === E2E_PASSWORD) await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible({ timeout: 15_000 });
}

test.describe("admin dashboard", () => {
  test("blocks anonymous visitors", async ({ page, request }) => {
    expect((await request.get("/api/admin/pages")).status()).toBe(401);
    await page.goto("/admin/pages");
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
  });

  test("rejects a wrong password", async ({ page }) => {
    await signIn(page, ADMIN, "Not-The-Right-Password-1");
    await expect(page.getByRole("alert")).toContainText("didn't work");
  });

  test("full page lifecycle: create, draft, preview, publish, unpublish", async ({ page, context }) => {
    await signIn(page, ADMIN);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();

    // Create
    await page.getByRole("link", { name: "Pages", exact: true }).click();
    await page.getByRole("button", { name: "New page" }).click();
    await page.getByLabel("Page title").fill("E2E Programs");
    await expect(page.getByLabel("Web address")).toHaveValue("e2e-programs");
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page.getByRole("heading", { name: "E2E Programs" })).toBeVisible();

    // Add a text section and type into the rich-text editor
    await page.getByRole("button", { name: "Add a section" }).last().click();
    await page.getByRole("dialog", { name: "Add a section" }).getByRole("button", { name: /^Text/ }).click();
    const editor = page.getByRole("textbox", { name: "Text" });
    await editor.click();
    await page.keyboard.type("Our new summer programs start soon.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Draft saved/)).toBeVisible();

    // Not public yet
    expect((await page.request.get("/e2e-programs")).status()).toBe(404);

    // Private preview (needs the session)
    const preview = await context.newPage();
    await preview.goto("/preview/e2e-programs");
    await expect(preview.getByText("Preview — this is a draft")).toBeVisible();
    await expect(preview.getByText("Our new summer programs start soon.")).toBeVisible();
    await preview.close();

    // Publish
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText(/Published!/)).toBeVisible();
    const live = await page.request.get("/e2e-programs");
    expect(live.status()).toBe(200);
    expect(await live.text()).toContain("Our new summer programs start soon.");

    // Unpublish
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: /Unpublish/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("The page is now offline.")).toBeVisible();
    expect((await page.request.get("/e2e-programs")).status()).toBe(404);
  });

  test("restores an earlier version", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/pages");
    await page.getByRole("link", { name: /^About Us/ }).click();
    await page.getByRole("button", { name: /Text/ }).first().click();
    const editor = page.getByRole("textbox", { name: "Text" });
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Replaced everything by mistake.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Draft saved/)).toBeVisible();
    await page.getByRole("button", { name: /history/i }).click();
    await page.getByRole("button", { name: "Restore this version" }).last().click();
    await expect(page.getByText(/Earlier version restored/)).toBeVisible();
    await expect(page.getByText("Fixture vision text.").first()).toBeVisible();
  });

  test("uploads an image and a PDF to the media library", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/media");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([
        { name: "e2e-upload.png", mimeType: "image/png", buffer: makePng(1200, 800, [28, 118, 114]) },
        { name: "e2e-upload.pdf", mimeType: "application/pdf", buffer: makePdf("E2E upload") },
      ]);
    await expect(page.getByText(/2 files uploaded/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /e2e-upload\.png/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /e2e-upload\.pdf/ }).first()).toBeVisible();
    // Add a description (alt text)
    await page
      .getByRole("button", { name: /e2e-upload\.png/ })
      .first()
      .click();
    await page.getByLabel("Description (alt text)").fill("Teal test pattern");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  });

  test("creates, publishes and archives an event", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/collections/events");
    await page.getByRole("button", { name: "Add event" }).click();
    await page.getByLabel("Title").fill("E2E Community Dinner");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "E2E Community Dinner" })).toBeVisible();
    await page.getByLabel(/Price/).fill("Free");
    await page.getByLabel(/Event date/).fill("2027-05-01");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText(/Published — it/)).toBeVisible();
    const res = await page.request.get("/api/public/page?path=events/e2e-community-dinner");
    expect(res.status()).toBe(200);
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText(/Archived — hidden from the website/)).toBeVisible();
    expect((await page.request.get("/api/public/page?path=events/e2e-community-dinner")).status()).toBe(404);
  });

  test("edits the main menu", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/navigation");
    await page.getByRole("button", { name: "Add menu item" }).click();
    await page.getByLabel("Label").last().fill("Newsroom");
    await page.getByLabel("Goes to").last().fill("/events");
    await page.getByRole("button", { name: "Save menu" }).click();
    await expect(page.getByText("Menu saved")).toBeVisible();
    await page.goto("/");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Newsroom" })).toBeVisible();
  });

  test("editors without publishing rights can save drafts but not publish or manage people", async ({ page }) => {
    await signIn(page, EDITOR);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "People & access" })).toHaveCount(0);
    await page.goto("/admin/pages");
    await page.getByRole("link", { name: /^About Us/ }).click();
    await expect(page.getByText("An administrator will publish your changes.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Publish/ })).toHaveCount(0);
    const csrf = await page.evaluate(async () => ((await (await fetch("/api/auth/me")).json()) as { csrfToken: string }).csrfToken);
    const pages = await page.evaluate(async () => (await (await fetch("/api/admin/pages")).json()) as { pages: { id: string; path: string }[] });
    const id = pages.pages.find((p) => p.path === "about")!.id;
    const status = await page.evaluate(
      async ([pid, token]) => (await fetch(`/api/admin/pages/${pid}/publish`, { method: "POST", headers: { "x-csrf-token": token } })).status,
      [id, csrf],
    );
    expect(status).toBe(403);
    await page.goto("/admin/users");
    await expect(page.getByText("Only administrators can open this section.")).toBeVisible();
  });

  test("signs out", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await page.request.get("/api/admin/pages")).status()).toBe(401);
  });
});
