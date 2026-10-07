import { test, expect } from "playwright/test";

const baseURL = "http://127.0.0.1:4173";

test("Control Center renders and is browser-operable", async ({ page }) => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Zynkronyx");
  await expect(page.locator("nav button").first()).toBeVisible();

  const buttons = page.locator("button");
  await expect(buttons.first()).toBeVisible();
  await buttons.first().press("Enter");

  const navButtons = page.locator("nav button");
  const count = await navButtons.count();
  expect(count).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < Math.min(count, 5); i += 1) {
    await navButtons.nth(i).focus();
    await expect(navButtons.nth(i)).toBeFocused();
  }
});

test("interactive form controls expose an accessible name", async ({ page }) => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });

  const controls = page.locator("input, select, textarea");
  const count = await controls.count();

  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    const id = await control.getAttribute("id");
    const ariaLabel = await control.getAttribute("aria-label");
    const ariaLabelledBy = await control.getAttribute("aria-labelledby");

    let labelled = false;
    if (id) {
      labelled = await page.locator('label[for="' + id.replace(/"/g, '\"') + '"]').count() > 0;
    }
    if (!labelled) {
      labelled = await control.evaluate((el) => Boolean(el.closest("label")));
    }

    expect(
      Boolean(ariaLabel?.trim() || ariaLabelledBy?.trim() || labelled),
      tag + (id ? "#" + id : "") + " must have an explicit accessible name; placeholder alone is not sufficient"
    ).toBe(true);
  }
});
