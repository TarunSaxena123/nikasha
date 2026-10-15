// Vocabulary extensions in the builder and report (REQ-INP-22…26, REQ-RPT-22, 23; added 2026-10-15).
import { expect, test, type Page } from "@playwright/test";
import { acceptGate, fixture, mockServices } from "./helpers";

const ORB_REPORT = fixture<{ report: Record<string, unknown> }>("reports", "orb-cpr-2024.json").report;

async function basics(page: Page, lots = "2", option: RegExp | string = /^Both/) {
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: option, exact: typeof option === "string" }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("15");
  await page.getByRole("radio", { name: /^Intraday/ }).click();
  const l = page.getByTestId("prefill-number-of-lots");
  await l.getByRole("spinbutton").fill(lots);
  const confirm = l.getByRole("button", { name: "Confirm" });
  if (await confirm.isVisible()) await confirm.click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
}

async function addIndicator(page: Page, name: string) {
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("group", { name: "Choose an indicator" }).getByRole("button", { name, exact: true }).click();
}

test("build the ORB + CPR strategy: new indicators, exit conditions, index levels, trail after points, partial exit (AC-INP-16…20; AC-RPT-16, 17)", async ({ page }) => {
  const m = await mockServices(page, { evaluate: () => ({ status: 200, body: ORB_REPORT }) });
  await page.goto("/build");
  await acceptGate(page);
  await basics(page);

  await page.getByRole("radio", { name: /In the money/ }).click();
  await page.getByLabel("Distance in points").fill("100");
  await page.getByRole("button", { name: "Next" }).click();

  // Entry: opening range, pivots / CPR, EMA 20 (AC-INP-16)
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  await addIndicator(page, "Opening range");
  await page.getByLabel("Opening range Minutes").fill("15");
  await addIndicator(page, "Daily pivots / CPR");
  await addIndicator(page, "EMA");
  await page.getByLabel("EMA Period").fill("20");
  await page.getByLabel("EMA Price").selectOption("close");
  await page.getByRole("button", { name: "Add condition" }).first().click();
  const what = page.getByLabel("What to check").first();
  for (const label of ["Opening range 15 min high", "Pivots TC", "Pivots CPR width %", "Candle range (high − low)"]) {
    await expect(what.locator("option", { hasText: label })).toHaveCount(1);
  }
  await what.selectOption({ label: "Opening range 15 min low" });
  await page.getByLabel("Compare with").first().selectOption({ label: "Pivots TC" });
  await expect(page.getByText("Reads as: Opening range 15 min low is above Pivots TC")).toBeVisible();
  await page.getByRole("button", { name: "Mirror from Call" }).click(); // AC-INP-20
  await expect(page.getByText("Reads as: Opening range 15 min high is below Pivots BC")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Exit: stop, index-level target with mirror, exit when (AC-INP-17, 19)
  await page.getByLabel("Stop-loss type").selectOption("PCT_PREMIUM");
  await page.getByLabel("Stop-loss value").fill("30");
  await page.getByLabel("Target type").selectOption("SPOT_LEVEL");
  await page.getByLabel("Target level for calls", { exact: true }).selectOption({ label: "Pivots R2" });
  await page.getByTestId("levels-Target").getByRole("button", { name: "Mirror from calls" }).click();
  await expect(page.getByLabel("Target level for puts", { exact: true })).toHaveValue("ind:pivots:s2");
  await page.getByRole("checkbox", { name: /Exit at the next minute's open/ }).check();
  const exitBlock = page.locator('[data-field="exit_when"]');
  await exitBlock.getByRole("button", { name: "Add condition" }).first().click();
  await exitBlock.getByLabel("What to check").first().selectOption({ label: "Candle close" });
  await exitBlock.getByLabel("Condition", { exact: true }).first().selectOption("lt");
  await exitBlock.getByLabel("Compare with").first().selectOption({ label: "EMA 20 (close)" });
  await exitBlock.getByRole("button", { name: "Mirror from Call" }).click();
  await expect(exitBlock.getByText("Reads as: Close is above EMA 20 (close)")).toBeVisible();

  // Advanced: trail after points, partial exit (AC-INP-18, 19)
  await page.getByRole("button", { name: "Advanced options (optional)" }).click();
  await page.getByRole("switch", { name: /^Trail stop to cost/ }).click();
  await page.getByRole("radio", { name: "a number of premium points" }).check();
  await page.getByLabel("Trail points").fill("25");
  await page.getByRole("switch", { name: /^Partial exit/ }).click();
  await page.getByLabel("Partial exit percent").fill("50");
  await page.getByLabel("Partial exit trigger").selectOption("SPOT_LEVEL");
  await page.getByLabel("Partial exit level for calls", { exact: true }).selectOption({ label: "Pivots R1" });
  await page.getByTestId("levels-Partial exit").getByRole("button", { name: "Mirror from calls" }).click();
  await page.getByLabel("After the partial exit").selectOption("PARTIAL_CANDLE");
  await page.getByRole("button", { name: "Review strategy" }).click();

  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="partial_exit"]')).toContainText("Close 50% of the lots when the index reaches Pivots R1 (calls) / Pivots S1 (puts)");
  await expect(page.locator('[data-rule="index_target"]')).toContainText("Pivots R2 (calls) / Pivots S2 (puts)");
  await expect(page.locator('[data-rule="trail_to_cost"]')).toContainText("after a gain of 25 points");
  await expect(page.locator('[data-rule="exit_conditions"]')).toContainText("Exit a put when");

  await page.getByRole("checkbox", { name: /checked the costs and period/ }).check();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  const sent = m.evaluate[0] as {
    strategy: {
      exit: { target: unknown; exit_when: { pe: { conditions: unknown[] } } };
      advanced: { trail_to_cost_at_pts: number; partial_exit: unknown };
    };
  };
  expect(sent.strategy.exit.target).toEqual({ type: "SPOT_LEVEL", ce: { ind: "pivots", output: "r2" }, pe: { ind: "pivots", output: "s2" } });
  expect(sent.strategy.advanced.trail_to_cost_at_pts).toBe(25);
  expect(sent.strategy.advanced.partial_exit).toEqual({
    percent: 50, then_stop: "PARTIAL_CANDLE",
    when: { type: "SPOT_LEVEL", ce: { ind: "pivots", output: "r1" }, pe: { ind: "pivots", output: "s1" } },
  });
  expect(sent.strategy.exit.exit_when.pe.conditions[0]).toEqual({ type: "compare", left: { price: "close" }, op: "gt", right: { ind: "ema", output: "value" } });

  // Report: partial exits in the trade table (AC-RPT-16) and the new reason texts (AC-RPT-17)
  const cells = page.getByTestId("partial-exit");
  await expect(cells.filter({ hasText: "65 qty" }).first()).toBeVisible();
  await expect(page.getByTestId("trades")).toContainText("Index reached the target level");
});

test("index-level choices are unavailable with several legs (AC-INP-19; SEM-22)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await basics(page, "1", "Call");
  await page.getByRole("radio", { name: /At the money/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "At a fixed time", exact: true }).check();
  await page.locator('input[aria-label="Entry time"]').first().fill("09:20");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Stop-loss type").selectOption("PCT_PREMIUM");
  await page.getByLabel("Stop-loss value").fill("30");
  await page.getByRole("button", { name: "Advanced options (optional)" }).click();
  await page.getByRole("switch", { name: /^Multiple legs/ }).click();
  await page.locator('[data-advanced="multiple_legs"]').getByText("Leg 2").waitFor();
  await page.getByRole("button", { name: /^4 Exit/ }).click();
  await expect(page.getByLabel("Target type").locator('option[value="SPOT_LEVEL"]')).toBeDisabled();
  await expect(page.getByText("Index-level exits work with one leg only.")).toBeVisible();
});

test("upload the ORB + CPR strategy: every rule understood, only the vague ones asked (AC-UPL-16)", async ({ page }) => {
  const result = fixture<{ questions: unknown[] }>("extraction", "orb-cpr-sample.json");
  await mockServices(page, { extract: () => ({ status: 200, body: result }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("NIFTY 15-MIN ORB + CPR STRATEGY (pasted)");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("found")).toContainText("20 EMA");
  await expect(page.getByTestId("unsupported")).toHaveCount(0); // nothing is "can't be tested" any more
  await expect(page.getByRole("button", { name: `Answer ${result.questions.length + 3} questions` })).toBeVisible();
});
