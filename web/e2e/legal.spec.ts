// Feature 07 (AC-PRV-01…04, 08, 09, 11, 13, 14, 20, 21): gate, legal texts, browser privacy.
import { expect, test } from "@playwright/test";
import { acceptGate, mockServices } from "./helpers";

test("open routes render without the gate @phone", async ({ page }) => {
  await mockServices(page);
  for (const path of ["/", "/disclaimer", "/learn", "/learn/what-is-drawdown"]) {
    await page.goto(path);
    await expect(page.getByTestId("disclaimer-gate")).toHaveCount(0);
  }
});

test("Get started → gate → /start; acceptance remembered", async ({ page }) => {
  await mockServices(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/start$/);
  const gate = page.getByTestId("disclaimer-gate");
  await expect(gate).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toHaveCount(0);
  const cont = page.getByRole("button", { name: "Continue" });
  await expect(cont).toBeDisabled();
  await acceptGate(page);
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await page.goto("/templates");
  await expect(page.getByTestId("disclaimer-gate")).toHaveCount(0);
});

test("direct link to /build shows the gate and no builder content, then /build", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await expect(page.getByTestId("disclaimer-gate")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Builder steps" })).toHaveCount(0);
  await acceptGate(page);
  await expect(page).toHaveURL(/\/build/);
  await expect(page.getByRole("navigation", { name: "Builder steps" })).toBeVisible();
});

test("Back to intro stores nothing", async ({ page }) => {
  await mockServices(page);
  await page.goto("/start");
  await page.getByRole("button", { name: "Back to intro" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([]);
});

test("meta failure: dates unavailable, Continue waits, Try again recovers", async ({ page }) => {
  let fail = true;
  await page.route("http://localhost:8000/v1/meta", async (route) => {
    if (fail) return route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" });
    const { META } = await import("./helpers");
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(META) });
  });
  await page.goto("/start");
  await expect(page.getByTestId("disclaimer-gate")).toContainText("dates unavailable");
  await page.getByRole("checkbox", { name: "I understand and agree" }).check();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("disclaimer-gate")).toContainText("9 Jan 2015 to 14 May 2026");
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("footer short disclaimer with data dates on every route", async ({ page }) => {
  await mockServices(page);
  await page.goto("/start");
  await acceptGate(page);
  for (const path of ["/", "/disclaimer", "/learn", "/start", "/templates", "/build", "/upload", "/review", "/evaluate", "/report"]) {
    await page.goto(path);
    await expect(page.getByTestId("short-disclaimer").first()).toContainText("(9 Jan 2015 – 14 May 2026, read from the data)");
  }
});

test("/disclaimer has the trademark and non-commercial statements and the data source", async ({ page }) => {
  await mockServices(page);
  await page.goto("/disclaimer");
  await expect(page.getByText(/NIFTY 50 and India VIX are trademarks/)).toBeVisible();
  await expect(page.getByText(/solely for non-commercial, educational purposes/)).toBeVisible();
  await expect(page.getByTestId("data-source").first()).toContainText("9 Jan 2015 – 14 May 2026");
});

test("browser privacy: only the disclaimer key, no cookies, no third-party or own-origin data requests", async ({ page, context }) => {
  const requests: { url: string; method: string; hasBody: boolean }[] = [];
  page.on("request", (r) => requests.push({ url: r.url(), method: r.method(), hasBody: !!r.postData() }));
  await mockServices(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual(["nikasha.disclaimer"]);
  expect(await page.evaluate(() => Object.keys(window.sessionStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  const hosts = new Set(requests.map((r) => new URL(r.url).host));
  for (const h of hosts) expect(["localhost:3000", "localhost:8000", "localhost:8001"]).toContain(h);
  expect(requests.filter((r) => r.hasBody && r.url.startsWith("http://localhost:3000"))).toEqual([]);
});

test("brand: logo beside the name in the header; tab icons linked and served", async ({ page, request }) => {
  await page.goto("/");
  const home = page.getByRole("link", { name: /^Nikasha/ });
  await expect(home.locator("svg[aria-hidden='true']")).toHaveCount(1);
  for (const rel of ["icon", "apple-touch-icon"]) {
    const hrefs = await page.locator(`link[rel="${rel}"]`).evaluateAll((ls) => ls.map((l) => l.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect((await request.get(h!)).status()).toBe(200);
  }
});
