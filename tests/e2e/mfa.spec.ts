import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formAlert, hasSupabase, totp } from "./helpers";

/**
 * Super admin sign-in at aal1 → MFA enrolment → backup codes → admin, then the
 * challenge path and backup-code recovery. Uses a throwaway super admin created
 * through the service key and deleted afterwards, so no real account is touched.
 */
test.describe("super admin MFA", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasSupabase, "Needs Supabase URL + service key in .env.local");

  const email = `e2e-super-${Date.now()}@example.com`;
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  let svc: SupabaseClient;
  let userId = "";
  let secret = "";
  let backupCodes: string[] = [];

  test.beforeAll(async () => {
    svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    await svc.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });
    const { error: roleErr } = await svc.from("user_roles").insert({ user_id: userId, role: "super_admin", office_id: null });
    if (roleErr) throw new Error(`Couldn't assign super_admin (has docs/supabase_patch.sql been run?): ${roleErr.message}`);
  });

  test.afterAll(async () => {
    if (userId) await svc.auth.admin.deleteUser(userId);
  });

  const signIn = async (page: Page) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  };

  test("password only (aal1) routes a new super admin to enrolment, not 'no access'", async ({ page }) => {
    await signIn(page);
    await page.waitForURL(/\/admin\/mfa\?.*step=enrol/);
    await expect(page.getByText("doesn't have admin access")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Set up your authenticator" })).toBeVisible();
    await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();
    // Super admin powers stay off until MFA: the dashboard bounces back here.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/mfa/);
    await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();

    const keyText = await page.getByText("Can’t scan? Enter this key:").textContent();
    secret = keyText!.split(":").pop()!.trim();
    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page.getByRole("heading", { name: "Save your backup codes" })).toBeVisible();
    const items = page.getByRole("list", { name: "Backup codes" }).getByRole("listitem");
    await expect(items).toHaveCount(10);
    backupCodes = await items.allTextContents();
    const cont = page.getByRole("button", { name: "Continue to admin" });
    await expect(cont).toBeDisabled();
    await page.getByLabel("I’ve saved these codes").check();
    await cont.click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("with a factor, sign-in goes to the challenge and a backup code resets it", async ({ page }) => {
    test.skip(!secret, "Depends on the enrolment test");
    await signIn(page);
    await page.waitForURL(/\/admin\/mfa\?.*step=verify/);
    await expect(page.getByLabel("6-digit code")).toBeVisible();
    await expect(page.getByAltText("QR code for your authenticator app")).toHaveCount(0);

    await page.getByRole("button", { name: "Lost your authenticator? Use a backup code" }).click();
    await page.getByLabel("Backup code").fill("WRONG-CODE0");
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expect(formAlert(page)).toContainText("didn't work");
    await page.getByLabel("Backup code").fill(backupCodes[0]);
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expect(page.getByRole("heading", { name: "Set up your authenticator" })).toBeVisible();
  });

  test("a user with no admin role still gets 'no admin access'", async ({ page }) => {
    const plain = `e2e-member-${Date.now()}@example.com`;
    const { data, error } = await svc.auth.admin.createUser({ email: plain, password, email_confirm: true });
    if (error) throw error;
    try {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(plain);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(formAlert(page)).toContainText("doesn't have admin access");
    } finally {
      await svc.auth.admin.deleteUser(data.user.id);
    }
  });
});
