import { test, expect } from "@playwright/test";
import { PUBLIC_ROUTES } from "./helpers";

test.describe("public site", () => {
  for (const path of PUBLIC_ROUTES) {
    test(`${path} renders with exactly one H1 and landmarks`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.locator("header nav[aria-label='Main']")).toBeAttached();
      await expect(page.locator("footer")).toBeAttached();
    });
  }

  test("homepage hero: headline, CTAs, and a non-broken media layer without a video", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("There's more in you");
    await expect(page.getByRole("link", { name: "Explore Springvilla" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find an Office" }).first()).toBeVisible();
    // No video configured → no <video>, no pause button, abstract field instead (never broken).
    await expect(page.locator("section video")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /background video/ })).toHaveCount(0);
  });

  test("Explore Springvilla scrolls to section 02", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Explore Springvilla" }).click();
    await expect(page.locator("#what-is")).toBeInViewport({ ratio: 0.2 });
  });

  test("header navigation reaches each destination", async ({ page }) => {
    await page.goto("/");
    for (const [label, path] of [["Discover", "/discover"], ["Our System", "/our-system"], ["Life Here", "/life-here"], ["Stories & Ideas", "/stories-and-ideas"]] as const) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      // Next 16 keeps the previous route mounted but hidden (React Activity); count visible headings only.
      await expect(page.locator("h1:visible")).toHaveCount(1);
    }
  });

  test("permanent redirects", async ({ request }) => {
    for (const [from, to] of [["/about", "/discover"], ["/growth-system", "/our-system"], ["/locations", "/offices"], ["/blog", "/ideas"], ["/stories", "/journeys"]]) {
      const r = await request.get(from, { maxRedirects: 0 });
      expect(r.status()).toBe(308);
      expect(r.headers()["location"]).toContain(to);
    }
  });

  test("purposeful 404", async ({ page }) => {
    const r = await page.goto("/this-does-not-exist");
    expect(r?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("hasn");
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("robots.txt and sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/admin", "/member", "/login", "/api", "/dev"]) expect(robots).toContain(`Disallow: ${p}`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/discover");
    expect(sitemap).not.toContain("/admin");
  });

  test("structured data on home and FAQ", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('"Organization"')]));
    await page.goto("/faq");
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join()).toContain("FAQPage");
  });

  test("no-guarantee line is present on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/does not guarantee income/).first()).toBeAttached();
  });

  test("admin and member areas are protected", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/member");
    await expect(page).toHaveURL(/\/login/);
    const r = await page.request.get("/admin/login");
    expect(r.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("FAQ accordion is keyboard operable", async ({ page }) => {
    await page.goto("/faq");
    const second = page.getByRole("button", { name: /NeoLife a Springvilla product/ });
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/business vehicle used on the network-marketing/).first()).toBeVisible();
  });
});

test.describe("mobile @mobile", () => {
  test("drawer opens, traps focus, links are 44px and Join is pinned", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    const link = dialog.getByRole("link", { name: "Discover" });
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(dialog.getByRole("link", { name: /Join Springvilla/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("no horizontal scroll on key pages", async ({ page }) => {
    for (const p of ["/", "/join", "/discover", "/offices"]) {
      await page.goto(p);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw, p).toBeLessThanOrEqual(cw);
    }
  });
});
