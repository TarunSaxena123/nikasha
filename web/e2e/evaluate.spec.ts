// Features 02 and 05: intro, start, templates → review → evaluate → report → downloads.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { META, STF_REPORT, ZERO_REPORT, acceptGate, mockServices } from "./helpers";

async function useTemplate(page: Page, id = "simple-trend-follower") {
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId(`template-${id}`).getByRole("button", { name: "Use this template" }).click();
  await expect(page).toHaveURL(/\/review$/);
}

test("intro: seven sections in order, two Get started buttons, meta dates (AC-BEG-01) @phone", async ({ page }) => {
  await mockServices(page);
  await page.goto("/");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(["hero", "what", "helps", "tips", "not", "data", "cta"]);
  await expect(page.getByRole("link", { name: "Get started" })).toHaveCount(3); // header + hero + bottom
  await expect(page.getByText("from 9 Jan 2015 to 14 May 2026")).toBeVisible();
});

test("Choose a path has three options with who they suit (AC-BEG-02)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/start");
  await acceptGate(page);
  const cards = page.getByTestId("path-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("New to options");
  await expect(cards.nth(1)).toContainText("Have rules in your head");
  await expect(cards.nth(2)).toContainText("Have rules written down");
  await expect(page.getByRole("link", { name: "See templates" })).toHaveAttribute("href", "/templates");
  await expect(page.getByRole("link", { name: "Start building" })).toHaveAttribute("href", "/build");
  await expect(page.getByRole("link", { name: "Upload or paste" })).toHaveAttribute("href", "/upload");
});

test("templates: cards, straddle risk callout, one-click evaluate with the displayed values (AC-BEG-03, 04, 06)", async ({ page }) => {
  const m = await mockServices(page);
  await page.goto("/templates");
  await acceptGate(page);
  const stf = page.getByTestId("template-simple-trend-follower");
  await expect(stf.getByTestId("template-values")).toContainText("1 lot × 65 = 65 quantity");
  await expect(stf.getByTestId("template-values")).toContainText("11 Feb 2019 – 14 May 2026 (full range)");
  const straddle = page.getByTestId("template-simple-short-straddle");
  await expect(straddle.getByRole("alert")).toContainText("much more than the premium");
  await stf.getByRole("button", { name: "Use this template" }).click();
  await expect(page.getByTestId("still-needed")).toHaveCount(0);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  expect(m.evaluate).toHaveLength(1);
  const body = m.evaluate[0] as { strategy: { position: unknown }; settings: { period: unknown; costs: Record<string, number> } };
  expect(body.strategy.position).toEqual({ lots: 1, lot_size: 65 });
  expect(body.settings.period).toEqual({ start: "2019-02-11", end: "2026-05-14" });
  expect(body.settings.costs.brokerage_per_order).toBe(20);
  await expect(page).toHaveTitle("✓ Report ready — Nikasha");
});

test("Customize opens the builder with nothing confirmed (AC-BEG-05)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Customize" }).click();
  await expect(page).toHaveURL(/\/build\?step=basics/);
  await expect(page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" })).toBeVisible();
});

test("review: rules with Not used, costs checkbox, confirm and Edit link (AC-EVL-01, 02, 03, 04, 10; AC-INP-05; REQ-EVL-07)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Customize" }).click();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await expect(page.getByTestId("step-needed")).toContainText("Lot size");
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("spinbutton").fill("75");
  await page.getByRole("button", { name: "Review strategy" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByTestId("still-needed")).toContainText("I've checked the costs and period");
  await expect(page.getByRole("button", { name: "Evaluate Strategy" })).toBeDisabled();
  await expect(page.locator('[data-rule="sl_cap"]')).toContainText("Not used");
  await expect(page.locator('[data-rule="entry_windows"]')).toContainText("09:30–14:30");
  await expect(page.locator('[data-rule="lot_size"]')).toContainText("1 lot × 75 = 75 quantity per trade");
  await expect(page.getByText("Typical flat discount-broker fee (Nikasha assumption)")).toBeVisible();
  await page.getByRole("checkbox", { name: /checked the costs and period/ }).check();
  await expect(page.getByRole("button", { name: "Evaluate Strategy" })).toBeEnabled();
  await expect(page.getByText("Premiums are modelled, not actual.")).toBeVisible(); // beside Evaluate (REQ-EVL-07)
  await expect(page.getByRole("main").getByTestId("short-disclaimer")).toBeVisible();
  await page.getByLabel("Brokerage").fill("25");
  await expect(page.getByRole("button", { name: "Evaluate Strategy" })).toBeDisabled(); // changing a cost asks for a fresh tick
  await page.locator('[data-rule="stop_loss"]').getByRole("link", { name: /Edit/ }).click();
  await expect(page).toHaveURL(/\/build\?step=exit&from=review/);
  await expect(page.getByRole("button", { name: "Back to review" })).toBeVisible();
});

test("4-hour intraday note (AC-EVL-05)", async ({ page }) => {
  await mockServices(page);
  await useTemplate(page);
  await page.locator('[data-rule="timeframe"]').getByRole("link", { name: /Edit/ }).click();
  await page.getByTestId("timeframe").selectOption("240");
  await page.getByRole("button", { name: "Back to review" }).click();
  await expect(page.getByText(/only the 13:14 candle close can trigger entries/)).toBeVisible();
});

test("busy twice then the report; four 503s show Busy with Retry; 422 returns to review (AC-EVL-09)", async ({ page }) => {
  let mode: "flaky" | "busy" | "invalid" = "flaky";
  const m = await mockServices(page, {
    evaluate: (n) => {
      if (mode === "flaky") return n <= 2 ? { status: 429, body: {} } : { status: 200, body: STF_REPORT };
      if (mode === "busy") return { status: 503, body: {} };
      return { status: 422, body: { error: { code: "VALIDATION_FAILED", message: "fix", problems: [{ field_label: "Strike", message: "For ITM or OTM, enter a distance in steps of 50 points (e.g. 100).", rule: "SEM-06" }] } } };
    },
  });
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible({ timeout: 15000 });
  expect(m.evaluate.length).toBe(3);
  mode = "busy";
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByText("Busy right now, please try again.")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  mode = "invalid";
  await page.getByRole("link", { name: "Back to review" }).click();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("still-needed")).toContainText("enter a distance in steps of 50 points");
});

test("progress screen: stages, learning cards, warning; Cancel ignores the late reply (AC-EVL-06, 07)", async ({ page }) => {
  await mockServices(page, { evaluate: () => ({ status: 200, body: STF_REPORT, delayMs: 3000 }) });
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page).toHaveURL(/\/evaluate$/);
  await expect(page.getByTestId("stage")).toHaveText(/Preparing data…|Simulating trades…/);
  await expect(page.getByText("Keep this tab open. Closing it will lose your result.")).toBeVisible();
  await expect(page.getByTestId("learning-cards").getByRole("listitem")).toHaveCount(3);
  await page.getByTestId("learning-cards").getByRole("button", { name: "Read" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("What is drawdown?");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.waitForTimeout(3500);
  await expect(page).toHaveURL(/\/review$/);
});

test("report: section order, risk before result, chart table toggle, pages, overfit and sensitivity (AC-RPT-11, 12) @phone", async ({ page }) => {
  await mockServices(page);
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  const order = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(order).toEqual(["header", "summary", "risk", "result", "charts", "breakdowns", "overfit", "sensitivity", "whatif", "suggestions", "trades", "settings", "disclaimer"]);
  await expect(page.getByTestId("risk-tiles")).toContainText("Max drawdown");
  await expect(page.getByText("Premiums modelled, not actual").first()).toBeVisible();
  await page.getByRole("button", { name: "Show as table" }).click();
  await expect(page.getByRole("button", { name: "Show as chart" })).toBeVisible();
  const total = (STF_REPORT.trades as unknown[]).length;
  await expect(page.getByTestId("trade-page")).toHaveText(`Page 1 of ${Math.ceil(total / 50)}`);
  await expect(page.getByTestId("overfit")).toContainText("Held up on unseen data");
  await expect(page.getByTestId("sensitivity")).toContainText("VIX −2");
});

test("zero trades: no charts, no CSV button, explanation (AC-RPT-10, 15)", async ({ page }) => {
  await mockServices(page, { evaluate: () => ({ status: 200, body: ZERO_REPORT }) });
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByText("No trades in this period.")).toBeVisible();
  await expect(page.locator("[data-chart]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download trades (CSV)" })).toHaveCount(0);
});

test("downloads: PDF and CSV saved in the browser with no network request (AC-RPT-13, 14)", async ({ page }) => {
  await mockServices(page);
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download trades (CSV)" }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^nikasha-trades-simple-trend-follower-\d{8}\.csv$/);
  const text = readFileSync((await csv.path())!, "utf8");
  expect(text).toContain("# Educational use only.");
  expect(text).toContain("Trade #,Side,Legs");
  const [pdf] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^nikasha-report-simple-trend-follower-\d{8}\.pdf$/);
  const bytes = readFileSync((await pdf.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  // Only the site's own code chunks may load (the PDF library); nothing is sent anywhere.
  expect(requests.filter((u) => !u.startsWith("blob:") && !u.startsWith("data:") && !u.startsWith("http://localhost:3000/_next/static/"))).toEqual([]);
  void META;
});
