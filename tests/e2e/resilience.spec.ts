import { test, expect } from "@playwright/test";

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("homepage content is visible immediately and nothing is pinned", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    // All journey words visible as a static list
    for (const w of ["Orient.", "Learn.", "Practise.", "Apply.", "Grow."]) await expect(page.locator("[data-word]", { hasText: w })).toBeVisible();
  });
});

test.describe("JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });
  for (const path of ["/", "/discover", "/join", "/our-system"]) {
    test(`${path} is readable without JS`, async ({ page }) => {
      await page.goto(path);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
      await expect(h1).toHaveCSS("opacity", "1");
      const hidden = await page.evaluate(() => Array.from(document.querySelectorAll("[data-reveal]")).filter((e) => getComputedStyle(e).opacity === "0").length);
      expect(hidden).toBe(0);
    });
  }
  test("ideas listing and search box render without JS", async ({ page }) => {
    await page.goto("/ideas");
    await expect(page.getByLabel("Search articles")).toBeVisible();
    await expect(page.getByText(/No articles have been published yet|min read/).first()).toBeVisible();
  });
});

test("motion: hero entrance does not delay first paint (no loading gate)", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached({ timeout: 3000 });
});
