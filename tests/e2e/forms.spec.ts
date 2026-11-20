import { test, expect } from "@playwright/test";
import { hasSupabase } from "./helpers";

test.describe("join form", () => {
  test("inline validation shows field errors and keeps input", async ({ page }) => {
    await page.goto("/join");
    await page.getByLabel("Full name").fill("Ada");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send my details" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Enter a phone number we can reach you on")).toBeVisible();
    await expect(page.getByText("Choose what you're interested in")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Ada");
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("honeypot field is hidden from people and assistive tech", async ({ page }) => {
    await page.goto("/join");
    const hp = page.locator('input[name="website"]');
    await expect(hp).toBeAttached();
    await expect(hp).not.toBeInViewport();
    expect(await hp.getAttribute("tabindex")).toBe("-1");
  });

  test("submits, shows success, and a repeat submission is de-duplicated", async ({ page }) => {
    test.skip(!hasSupabase, "Needs Supabase credentials (see docs/OWNER_TODO.md)");
    const email = `e2e+${Date.now()}@example.com`;
    for (let i = 0; i < 2; i++) {
      await page.goto("/join");
      await page.waitForTimeout(2700); // the anti-bot timer
      await page.getByLabel("Full name").fill("E2E Test");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Phone").fill("+44 7000 000000");
      await page.getByLabel("How should we contact you?").selectOption("email");
      await page.getByLabel("City or town").fill("Testville");
      await page.getByText("Digital Skills & Freelancing").click();
      await page.getByLabel(/I agree that Springvilla can store/).check();
      await page.getByRole("button", { name: "Send my details" }).click();
      await expect(page.getByRole("status")).toContainText(i === 0 ? "Thank you" : "already have your details");
    }
  });
});

test("contact form routes by enquiry type and validates", async ({ page }) => {
  await page.goto("/contact?type=media");
  await expect(page.getByLabel("Media")).toBeChecked();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
});
