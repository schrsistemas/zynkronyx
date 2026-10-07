const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.describe("Control Center browser and accessibility contract", () => {
  test("renders the public Control Center in Chromium", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("Zynkronyx");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toBeVisible();
  });

  test("supports keyboard focus on primary navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const navButtons = page.locator("aside nav button");
    await expect(navButtons.first()).toBeVisible();
    await navButtons.first().focus();
    await expect(navButtons.first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(navButtons.nth(1)).toBeFocused();
  });

  test("has no automatically detectable WCAG violations", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    expect(
      results.violations.map((v) => v.id + ": " + v.help).join("\n")
    ).toEqual("");
  });

  test("form controls expose accessible names", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const unnamed = await page.locator("input, select, textarea").evaluateAll((controls) =>
      controls.filter((el) => {
        if (el.disabled || el.type === "hidden") return false;
        const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
        const id = el.id;
        const label = id ? document.querySelector("label[for='" + id + "']") : null;
        return !labelled && !label && !el.closest("label");
      }).map((el) => el.tagName.toLowerCase() + ":" + (el.getAttribute("name") || el.getAttribute("placeholder") || "unnamed"))
    );

    expect(unnamed).toEqual([]);
  });
});
