// UAT against the REAL local stack: engine on :8000 and the extraction function on :8001 (live AI calls,
// a few cents). Never runs in CI: set NIKASHA_UAT=1. Each journey also checks the numbers it gets back.
import { expect, test, type Page, type Response } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { acceptGate } from "./helpers";

test.skip(!process.env.NIKASHA_UAT, "UAT needs the real local stack and a live AI key (set NIKASHA_UAT=1)");
test.setTimeout(Number(process.env.UAT_TIMEOUT ?? 240_000));

type Trade = { net_pnl: number; gross_pnl: number; costs: number; partial_exit?: { quantity: number } };
type Report = { metrics: { trades: number; net_pnl: number }; trades: Trade[]; equity_curve: { equity: number }[] };

const consoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
};

async function evaluateAndCheck(page: Page): Promise<Report> {
  const resp: Promise<Response> = page.waitForResponse((r) => r.url().endsWith("/v1/evaluate") && r.request().method() === "POST", { timeout: 180_000 });
  await page.getByRole("checkbox", { name: /checked the costs and period/ }).check();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  const r = await resp;
  expect(r.status()).toBe(200);
  const report = (await r.json()) as Report;
  await expect(page.getByTestId("report")).toBeVisible({ timeout: 30_000 });
  // The numbers add up.
  expect(report.trades).toHaveLength(report.metrics.trades);
  for (const t of report.trades) expect(Math.abs(t.gross_pnl - t.costs - t.net_pnl)).toBeLessThan(0.011);
  const sum = report.trades.reduce((a, t) => a + t.net_pnl, 0);
  expect(Math.abs(sum - report.metrics.net_pnl)).toBeLessThan(0.5);
  if (report.trades.length) expect(Math.abs(report.equity_curve.at(-1)!.equity - report.metrics.net_pnl)).toBeLessThan(0.5);
  return report;
}

test("U1 template, full period, real engine: report, numbers, what-if, ideas, downloads", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  const report = await evaluateAndCheck(page);
  expect(report.metrics.trades).toBeGreaterThan(100);
  const order = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(order.indexOf("risk")).toBeLessThan(order.indexOf("result"));
  // What-if on the real engine
  await page.getByTestId("slider-stop_loss").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("whatif-sentence")).toContainText("With a stop-loss of 25% instead of 30%", { timeout: 120_000 });
  // Ideas on the real engine: every idea finishes
  await page.getByRole("button", { name: "Show ideas" }).click();
  await expect(page.getByTestId("sug-progress")).toHaveText(/^(\d+) of \1 done$/, { timeout: 200_000 });
  // CSV has one line per trade
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download trades (CSV)" }).click()]);
  const lines = (await (await import("node:fs")).promises.readFile((await csv.path())!, "utf8")).split("\r\n").filter(Boolean);
  const header = lines.findIndex((l) => l.startsWith("Trade #"));
  expect(lines.length - header - 1).toBe(report.metrics.trades);
  const [pdf] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect(errors).toEqual([]);
});

test("U2 builder ORB + CPR with the new vocabulary, real engine", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/build");
  await acceptGate(page);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: /^Both/ }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("15");
  await page.getByRole("radio", { name: /^Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("spinbutton").fill("2");
  const c = page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" });
  if (await c.isVisible()) await c.click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /In the money/ }).click();
  await page.getByLabel("Distance in points").fill("100");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  for (const [name, fill] of [["Opening range", ["Opening range Minutes", "15"]], ["Daily pivots / CPR", null]] as const) {
    await page.getByRole("button", { name: "Add indicator" }).click();
    await page.getByRole("group", { name: "Choose an indicator" }).getByRole("button", { name, exact: true }).click();
    if (fill) await page.getByLabel(fill[0]).fill(fill[1]);
  }
  await page.getByRole("button", { name: "Add condition" }).first().click();
  await page.getByLabel("What to check").first().selectOption({ label: "Candle close" });
  await page.getByLabel("Compare with").first().selectOption({ label: "Opening range 15 min high" });
  await page.getByRole("button", { name: "Mirror from Call" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Stop-loss type").selectOption("PCT_PREMIUM");
  await page.getByLabel("Stop-loss value").fill("30");
  await page.getByLabel("Target type").selectOption("SPOT_LEVEL");
  await page.getByLabel("Target level for calls", { exact: true }).selectOption({ label: "Pivots R2" });
  await page.getByTestId("levels-Target").getByRole("button", { name: "Mirror from calls" }).click();
  await page.getByRole("button", { name: "Advanced options (optional)" }).click();
  await page.getByRole("switch", { name: /^Partial exit/ }).click();
  await page.getByLabel("Partial exit percent").fill("50");
  await page.getByLabel("Partial exit trigger").selectOption("PREMIUM_GAIN");
  await page.getByLabel("Partial exit gain", { exact: true }).fill("20");
  await page.getByLabel("Partial exit gain type").selectOption("POINTS");
  await page.getByLabel("After the partial exit").selectOption("COST");
  await page.getByRole("switch", { name: /^Daily limits/ }).click();
  await page.getByLabel("Max trades a day").fill("1");
  await page.getByRole("button", { name: "Review strategy" }).click();
  await page.getByRole("radio", { name: "Last 1 year" }).check();
  const report = await evaluateAndCheck(page);
  expect(report.trades.length).toBeGreaterThan(0);
  const partials = report.trades.filter((t) => t.partial_exit);
  for (const t of partials) expect(t.partial_exit!.quantity).toBe(65);
  if (partials.length) await expect(page.getByTestId("partial-exit").filter({ hasText: "65 qty" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

async function answerAll(page: Page) {
  const q = page.getByTestId("question");
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole("button", { name: "Review & Evaluate" }).isVisible()) break;
    const radios = q.getByRole("radio");
    if (await radios.count()) {
      const intraday = q.getByRole("radio", { name: /^Intraday/ });
      await ((await intraday.count()) ? intraday : radios.first()).check();
    }
    const num = q.getByRole("spinbutton");
    const lots = /how many lots/i.test((await q.getByRole("heading").first().textContent()) ?? "");
    if (await num.count()) {
      if (lots) await num.fill("2"); // the ORB strategy's partial exit needs 2 lots (SEM-25)
      else if (!(await num.inputValue())) await num.fill("30");
    }
    for (const name of ["Confirm", "Save"]) {
      const b = q.getByRole("button", { name, exact: true });
      if (await b.isVisible()) await b.click();
    }
    const next = page.getByRole("button", { name: "Next" });
    if ((await next.count()) && (await next.isEnabled())) await next.click(); // the last question has no Next
  }
  await page.getByRole("button", { name: "Review & Evaluate" }).click();
}

test("U3 upload the one-line sample (live AI), answer, evaluate on the real engine", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%.");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("found")).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: /^Answer \d+ questions?/ }).click();
  await answerAll(page);
  await expect(page).toHaveURL(/\/review$/, { timeout: 30_000 });
  await page.getByRole("radio", { name: "Last 1 year" }).check();
  await evaluateAndCheck(page);
  expect(errors).toEqual([]);
});

test("U4 upload the ORB + CPR sample (live AI): nothing unsupported; evaluate on the real engine", async ({ page }) => {
  const errors = consoleErrors(page);
  const text = (await import("node:fs")).readFileSync(new URL("../../samples/nifty_15min_orb_cpr_strategy.txt", import.meta.url), "utf8");
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill(text);
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("found")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("unsupported")).toHaveCount(0);
  await page.getByRole("button", { name: /^Answer \d+ questions?/ }).click();
  await answerAll(page);
  await expect(page).toHaveURL(/\/review$/, { timeout: 30_000 });
  await page.getByRole("radio", { name: "Last 1 year" }).check();
  await evaluateAndCheck(page);
  expect(errors).toEqual([]);
});

test("U5 phone: template to report on the real engine, accessible report @phone", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-short-straddle").getByRole("button", { name: "Use this template" }).click();
  await page.getByRole("radio", { name: "Last 1 year" }).check();
  await evaluateAndCheck(page);
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(scroll).toBeLessThanOrEqual(1); // no sideways page scroll on a phone
  const a11y = await new AxeBuilder({ page }).include("main").analyze();
  expect(a11y.violations.map((v) => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});
