import { defineConfig, devices } from "@playwright/test";

// The UAT journeys (e2e/uat.spec.ts) against the deployed site and backend. AI calls are paid: keep live
// AI testing to the one-line sample (U3) only, once; U1, U2 and U5 use the engine only.
// Run: NIKASHA_UAT=1 npx playwright test --config playwright.live.config.ts -g "U1|U2|U5"
export default defineConfig({
  testDir: "./e2e",
  testMatch: /uat\.spec\.ts/,
  timeout: 240_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: process.env.NIKASHA_LIVE_URL ?? "https://nikasha.vercel.app", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
  ],
});
