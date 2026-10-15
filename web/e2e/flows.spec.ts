// Features 04 (upload), 03 (builder), 05 (what-if), 06 (suggestions); accessibility and the
// "no technical text" guard across the main screens.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { STF_REPORT, acceptGate, fixture, mockServices } from "./helpers";

async function useTemplate(page: Page) {
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
}

async function answerChoice(page: Page, label: RegExp | string) {
  await page.getByTestId("question").getByLabel(label).check();
}

test("upload: privacy notice first, refused input sends nothing (AC-UPL-01)", async ({ page }) => {
  const m = await mockServices(page);
  await page.goto("/upload");
  await acceptGate(page);
  const notice = page.getByTestId("upload-privacy");
  await expect(notice).toContainText("Anthropic");
  await expect(notice).toContainText("30 days");
  await page.getByTestId("file-input").setInputFiles({ name: "plan.xlsx", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("x") });
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Please use a PDF, Word (.docx) or text file.");
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("x".repeat(20001));
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("too long");
  expect(m.extract).toHaveLength(0);
});

test("upload one-line sample: exactly holding, expiry, lots, lot size; positional adds the exit question (AC-UPL-07, 13)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "one-line-sample.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%.");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("found")).toContainText("30% of the option premium");
  await expect(page.getByTestId("needs-answer")).toContainText("Not in your document");
  await page.getByRole("button", { name: "Answer 4 questions" }).click();
  const q = page.getByTestId("question");
  await expect(q).toContainText("Which expiry do you trade?");
  await answerChoice(page, "Current weekly");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(q).toContainText("Intraday or positional?");
  await answerChoice(page, /Positional/);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(q).toContainText("How many lots");
  await q.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(q).toContainText("What lot size");
  await q.getByRole("button", { name: "Confirm" }).click();
  // Positional with no target or time exit: the exit question is added (5 of 5).
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 5 of 5")).toBeVisible();
  await expect(q).toContainText("What should happen to an open position?");
  await expect(page.getByRole("button", { name: "Review & Evaluate" })).toHaveCount(0);
  await answerChoice(page, /Hold until expiry/);
  await page.getByRole("button", { name: "Review & Evaluate" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="exit_rule"]')).toContainText("Held until expiry");
  await expect(page.locator('[data-rule="sl_cap"]')).toContainText("Not used");
  await expect(page.getByTestId("still-needed")).toContainText("I've checked the costs and period");
  await expect(page.getByTestId("still-needed")).not.toContainText("Lot size");
});

test("upload advanced sample: vague questions first, then missing; Back changes an answer (AC-UPL-09, 10, 15)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "advanced-sample.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByTestId("file-input").setInputFiles({ name: "plan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByText("Some text that wasn't a trading rule was ignored.")).toBeVisible();
  await page.getByRole("button", { name: /Answer 11 questions/ }).click();
  const q = page.getByTestId("question");
  await expect(q).toContainText("Read VIX at the day's open or at entry time?");
  await answerChoice(page, /^Day open \(09:15 value\)/);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(q).toContainText("What % of normal size should be traded when VIX is above 18?");
  await page.getByRole("button", { name: "Back" }).click();
  await answerChoice(page, /^At entry$/);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 2 of 11")).toBeVisible();
});

test("upload with VWAP: can't-be-tested list and acknowledgement, shown on review (AC-UPL-12)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "vwap.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM call when price crosses above VWAP, SL 20 points");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("unsupported")).toContainText("no volume and no VWAP");
});

test("upload errors: unreadable file and no rules (AC-UPL-14)", async ({ page }) => {
  let mode = "unreadable";
  await mockServices(page, {
    extract: () => mode === "unreadable"
      ? { status: 422, body: { error: { code: "UNREADABLE_FILE", message: "x" } } }
      : { status: 200, body: fixture("extraction", "no-rules.json") },
  });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByTestId("file-input").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByText(/couldn't read text from this file/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste the text instead" })).toBeVisible();
  mode = "none";
  await page.getByRole("button", { name: "Paste the text instead" }).click();
  await page.getByTestId("paste").fill("hello");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByText("We couldn't find trading rules in this text.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Use the builder" })).toBeVisible();
});

test("upload: Cancel returns to input and ignores the late reply (AC-UPL-02)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "one-line-sample.json"), delayMs: 2000 }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM Nifty call when RSI 14 crosses above 60");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByText(/Reading your strategy/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(2500);
  await expect(page.getByRole("button", { name: "Read my strategy" })).toBeVisible();
});

test("builder: gating, timeframe list, strike example, distance 75 problem, VWAP disabled (AC-INP-04, 06, 07, 09)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await expect(page.getByRole("button", { name: /2 Strike/ })).toBeDisabled();
  const options = await page.getByTestId("timeframe").locator("option").allTextContents();
  expect(options.slice(1)).toEqual(["1 min", "3 min", "5 min", "15 min", "30 min", "60 min", "4 hours"]);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: /Both/ }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("15");
  await page.getByRole("radio", { name: /Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /In the money/ }).click();
  await page.getByLabel("Distance in points").fill("100");
  await expect(page.getByTestId("strike-example")).toHaveText("Nifty at 24,500 → 100 points ITM Call = 24,400 CE; Put = 24,600 PE");
  await page.getByLabel("Distance in points").fill("75");
  await expect(page.getByTestId("step-needed")).toContainText("steps of 50 points");
  await page.getByLabel("Distance in points").fill("100");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  await page.getByRole("button", { name: "Add indicator" }).click();
  await expect(page.getByRole("button", { name: "VWAP" })).toBeDisabled();
  await expect(page.getByText(/VWAP isn't available for Nifty 50/)).toBeVisible();
});

test("what-if: one request after the slider settles, original kept, Use these settings (AC-BEG-10, 12)", async ({ page }) => {
  const m = await mockServices(page);
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  const thumb = page.getByTestId("slider-stop_loss");
  await thumb.focus();
  await page.keyboard.press("ArrowLeft"); // 30 → 25
  await expect(page.getByText("30% → 25%")).toBeVisible();
  await expect.poll(() => m.evaluate.length, { timeout: 5000 }).toBe(2);
  const body = m.evaluate[1] as { strategy: { exit: { stop_loss: unknown; target: unknown } } };
  expect(body.strategy.exit.stop_loss).toEqual({ type: "PCT_PREMIUM", value: 25 });
  expect(body.strategy.exit.target).toEqual({ type: "PCT_PREMIUM", value: 50 });
  await expect(page.getByTestId("whatif-sentence")).toContainText("With a stop-loss of 25% instead of 30%, this strategy would have");
  await page.getByRole("button", { name: "Use these settings" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="stop_loss"]')).toContainText("25% of premium");
  expect(m.evaluate).toHaveLength(2);
});

test("suggestions: nothing until Show ideas; at most 4 at a time; cards; Try this version (AC-SUG-01, 06, 07, 10, 11)", async ({ page }) => {
  const base = fixture<{ strategy: Record<string, unknown> }>("strategies", "valid", "simple-trend-follower.json");
  const variants = [20, 25, 35, 40, 15, 45, 50, 55, 60].map((v, i) => ({
    id: `v${i + 1}`, kind: "PARAMETER_SWEEP", group: "Stop-loss (% of premium)", change_text: `Stop-loss ${v}% instead of 30%`,
    reason_text: "Your stop-loss of 30% was tested on 325 trades; this shows how sensitive that result was to the value.",
    strategy: { ...base, exit: { stop_loss: { type: "PCT_PREMIUM", value: v }, target: { type: "PCT_PREMIUM", value: 50 } } },
  }));
  let inflight = 0;
  let maxInflight = 0;
  const m = await mockServices(page, {
    plan: () => ({ status: 200, body: { variants, not_offered_text: null } }),
    evaluate: async (n) => {
      if (n === 1) return { status: 200, body: STF_REPORT };
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setTimeout(r, 300));
      inflight--;
      return n === 4 ? { status: 500, body: { error: { code: "ENGINE_ERROR", message: "x" } } } : { status: 200, body: STF_REPORT };
    },
  });
  await useTemplate(page);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  expect(m.plan).toHaveLength(0);
  await page.getByRole("button", { name: "Show ideas" }).click();
  await expect(page.getByTestId("sug-progress")).toHaveText("9 of 9 done", { timeout: 15000 });
  expect(maxInflight).toBeLessThanOrEqual(4);
  await expect(page.getByTestId("sug-card")).toHaveCount(9);
  await expect(page.getByText("Couldn't run this one")).toHaveCount(1);
  await expect(page.getByTestId("tuning-check")).toHaveCount(0); // one variant failed, so no tuning check
  await expect(page.getByTestId("suggestions")).not.toContainText(/best|recommended/i);
  await page.getByTestId("sug-card").first().getByRole("button", { name: "Try this version" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="stop_loss"]')).toContainText("20% of premium");
});

test("accessibility (axe) and no technical text on main screens", async ({ page }) => {
  await mockServices(page);
  const guard = /\{"|":|option_type|PCT_PREMIUM|CURRENT_WEEKLY|TRIGGER_CANDLE|Traceback|undefined|NaN/;
  const check = async () => {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(await page.locator("main").innerText()).not.toMatch(guard);
  };
  await page.goto("/");
  await check();
  await page.goto("/templates");
  await acceptGate(page);
  await check();
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await check();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  await check();
  await page.goto("/learn");
  await check();
});

test("builder end to end: RSI cross call, 30% stop, intraday → Review strategy (AC-INP-08, 12; REQ-INP-16)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: "Call", exact: true }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("5");
  await page.getByRole("radio", { name: /Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /At the money/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "At a fixed time, if conditions are met" }).check();
  await expect(page.getByText("Enter when", { exact: true })).toBeVisible(); // Call only: one condition set (REQ-INP-16)
  await expect(page.getByText("Put when", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Call when", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Entry time" }).or(page.locator("input[type=time][aria-label=\"Entry time\"]")).first().fill("09:30");
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "RSI" }).click();
  await expect(page.getByLabel("RSI Period")).toHaveValue("");
  await page.getByRole("button", { name: "14" }).click();
  await page.getByRole("button", { name: "Add condition" }).click();
  await page.getByLabel("What to check").selectOption({ label: "RSI 14" });
  await page.getByLabel("Number").fill("55");
  await expect(page.getByText("Reads as: RSI 14 is above 55")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/square-off already counts as the time exit/)).toBeVisible();
  await page.getByLabel("Stop-loss type").selectOption("PCT_PREMIUM");
  await page.getByLabel("Stop-loss value").fill("30");
  await page.getByRole("button", { name: "Review strategy" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="entry"]')).toContainText("At 09:30, if the conditions below are met");
  await expect(page.locator('[data-rule="entry"]')).toContainText("RSI 14 is above 55");
});

test("full local stack: template → report from the real engine @stack", async ({ page }) => {
  test.skip(!process.env.NIKASHA_STACK, "needs the local engine on :8000 (set NIKASHA_STACK=1)");
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await page.getByRole("radio", { name: "Last 1 year" }).check();
  await page.getByRole("checkbox", { name: /checked the costs and period/ }).check();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("risk-tiles")).toContainText("Max drawdown");
  await expect(page.getByText(/15 May 2025 – 14 May 2026/).first()).toBeVisible();
});
