import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_BASE_PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
const reuseExistingServerOverride = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER;
const reuseExistingServer =
  reuseExistingServerOverride === "1"
    ? true
    : reuseExistingServerOverride === "0"
      ? false
      : !process.env.CI;
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  `./node_modules/.bin/next dev --port ${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer,
        timeout: 120_000,
        env: {
          ...process.env,
          DEMO_USER_EMAIL:
            process.env.E2E_RECIPIENT_EMAIL ?? "power.reviewer@townpet.dev",
        },
    },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
