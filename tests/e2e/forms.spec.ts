import { test, expect } from "@playwright/test";
import { hasSupabase } from "./helpers";

test.describe("join form (blueprint §12.2)", () => {
  test("exact fields: no date of birth, updates opt-in unticked, email OR phone", async ({ page }) => {
    await page.goto("/join");
    for (const l of ["Full name", "Email", "Phone", "City / state", "Preferred office", "Current occupation", "Question or message"]) await expect(page.getByLabel(l, { exact: false }).first()).toBeAttached();
    await expect(page.getByRole("group", { name: /What are you interested in/ })).toBeVisible();
    for (const opt of ["Digital skills", "Business", "Both", "Community / unsure"]) await expect(page.getByText(opt, { exact: true })).toBeVisible();
    await expect(page.getByLabel(/occasional updates/)).not.toBeChecked();
    await expect(page.getByLabel(/date of birth|age range/i)).toHaveCount(0);
    await expect(page.getByLabel("Preferred office")).toHaveValue("");
    await expect(page.locator("option", { hasText: "Help me find one" })).toBeAttached();
  });

  test("validates at submission, keeps input, and asks for email or phone", async ({ page }) => {
    await page.goto("/join");
    await page.getByLabel("Full name").fill("Ada");
    await page.getByRole("button", { name: "Submit Enquiry" }).click();
    await expect(page.getByText("Give us an email address or a phone number").first()).toBeVisible();
    await expect(page.getByText("Enter your city and state")).toBeVisible();
    await expect(page.getByText("Choose what you're interested in")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Ada");
    // Phone alone satisfies the contact rule; choosing Email then requires an email.
    await page.getByLabel("Phone", { exact: true }).fill("+234 800 000 0000");
    await page.getByRole("group", { name: /Preferred contact method/ }).getByText("Email", { exact: true }).click();
    await page.getByRole("button", { name: "Submit Enquiry" }).click();
    await expect(page.getByText("Add your email address to be contacted by email")).toBeVisible();
  });

  test("honeypot field is hidden from people and assistive tech", async ({ page }) => {
    await page.goto("/join");
    const hp = page.locator('input[name="website"]');
    await expect(hp).toBeAttached();
    await expect(hp).not.toBeInViewport();
    expect(await hp.getAttribute("tabindex")).toBe("-1");
  });

  test("submits, shows the §12.3 success copy, and de-duplicates a repeat", async ({ page }) => {
    test.skip(!hasSupabase, "Needs Supabase credentials (see docs/OWNER_TODO.md)");
    const email = `e2e+${Date.now()}@example.com`;
    for (let i = 0; i < 2; i++) {
      await page.goto("/join");
      await page.waitForTimeout(2700);
      await page.getByLabel("Full name").fill("E2E Test");
      await page.getByRole("textbox", { name: "Email" }).fill(email);
      await page.getByRole("group", { name: /Preferred contact method/ }).getByText("Email", { exact: true }).click();
      await page.getByLabel("City / state").fill("Ikeja, Lagos");
      await page.getByText("Digital skills", { exact: true }).click();
      await page.getByLabel(/how Springvilla will use my details/).check();
      await page.getByRole("button", { name: "Submit Enquiry" }).click();
      await expect(page.getByRole("status")).toContainText(i === 0 ? "Your enquiry has been received" : "already received");
    }
  });
});

test("contact form routes by enquiry type and validates", async ({ page }) => {
  await page.goto("/contact?type=media");
  await expect(page.getByLabel("Media")).toBeChecked();
  for (const t of ["General enquiry", "Office information", "Partnership", "Product-related enquiry", "Privacy request", "Technical support"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
});
