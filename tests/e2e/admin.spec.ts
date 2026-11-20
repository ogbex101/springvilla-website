import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { adminCreds, hasAdmin, totp, totpSecret } from "./helpers";

/**
 * End-to-end admin flows against a real Supabase project.
 * Requires .env.local with Supabase keys plus E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 * for a central_admin (not super_admin, which needs a TOTP code).
 */
test.describe("admin", () => {
  test("login page renders and rejects bad credentials generically", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    test.skip(!hasAdmin, "Needs Supabase + E2E_ADMIN_* credentials");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("didn't work");
  });

  test.describe("signed in", () => {
    test.skip(!hasAdmin, "Needs Supabase + E2E_ADMIN_* credentials");
    const login = async (page: Page) => {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(adminCreds.email);
      await page.getByLabel("Password").fill(adminCreds.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/admin(\/mfa.*)?$/);
      if (page.url().includes("/admin/mfa")) {
        // Super admin: complete TOTP only with a key the owner supplied. Never enrol a new factor.
        await expect(page.getByLabel("6-digit code")).toBeVisible();
        test.skip(await page.getByText("Scan this code").isVisible(), "Super admin has no authenticator yet: set one up in the browser first, then add E2E_ADMIN_TOTP_SECRET.");
        test.skip(!totpSecret, "Account is a super admin: add E2E_ADMIN_TOTP_SECRET (the key shown at authenticator setup) to run admin tests.");
        await page.getByLabel("6-digit code").fill(totp(totpSecret));
        await page.getByRole("button", { name: "Verify" }).click();
      }
      await expect(page).toHaveURL(/\/admin$/);
    };

    test("edit a section, publish, and see it live", async ({ page, browser }) => {
      await login(page);
      await page.goto("/admin/content/faq");
      await page.getByRole("button", { name: /^FAQ/ }).click();
      const marker = `Test question ${Date.now()}`;
      await page.getByRole("button", { name: "Add question" }).click();
      await page.getByLabel("Question").last().fill(marker);
      await page.getByLabel("Answer").last().fill("Answer written by the end-to-end test.");
      await page.getByRole("button", { name: "Publish" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
      const visitor = await browser.newPage();
      await visitor.goto("/faq");
      await expect(visitor.getByText(marker)).toBeVisible();
      // Restore previous version
      await page.getByRole("button", { name: "History" }).click();
      page.on("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Restore" }).first().click();
    });

    test("upload an image to the media library", async ({ page }) => {
      await login(page);
      await page.goto("/admin/media");
      const file = path.join(process.cwd(), "tests/fixtures/sample.png");
      if (!fs.existsSync(file)) test.skip(true, "fixture missing");
      await page.locator('input[type="file"]').first().setInputFiles(file);
      await expect(page.getByText("Done").first()).toBeVisible({ timeout: 30_000 });
      await page.getByLabel(/Alt text/).fill("Test image uploaded by e2e");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
    });
  });
});
