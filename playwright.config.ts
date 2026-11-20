import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Tests read the same .env.local as the app (Supabase keys, E2E_ADMIN_*).
loadEnv({ path: ".env.local", quiet: true });

const PORT = Number(process.env.E2E_PORT || 3100);
const BASE = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM || !process.env.CI ? { executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium" } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: BASE,
        reuseExistingServer: true,
        timeout: 120_000,
        // Sandboxes route outbound HTTPS through a proxy; Node's fetch only honours it with this flag.
        env: process.env.HTTPS_PROXY ? { NODE_USE_ENV_PROXY: "1" } : {},
      },
});
