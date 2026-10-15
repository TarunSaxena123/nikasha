// Acceptance criteria found without a test in the pre-deployment review (2026-10-15).
import { expect, test } from "@playwright/test";
import { STF_REPORT, acceptGate, mockServices } from "./helpers";

test("what-if: moving the slider again cancels the earlier run; only the latest result shows (AC-BEG-11)", async ({ page }) => {
  const aborted: string[] = [];
  page.on("requestfailed", (r) => { if (r.url().includes("/v1/evaluate")) aborted.push(r.failure()?.errorText ?? ""); });
  const m = await mockServices(page, {
    evaluate: (n) => ({ status: 200, body: STF_REPORT, delayMs: n === 2 ? 3000 : 0 }), // the 25% run is slow
  });
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  const thumb = page.getByTestId("slider-stop_loss");
  await thumb.focus();
  await page.keyboard.press("ArrowLeft"); // 30 → 25: starts the slow run
  await expect.poll(() => m.evaluate.length, { timeout: 5000 }).toBe(2);
  await page.keyboard.press("ArrowLeft"); // 25 → 20 while it runs
  await expect.poll(() => m.evaluate.length, { timeout: 5000 }).toBe(3);
  await expect(page.getByTestId("whatif-sentence")).toContainText("With a stop-loss of 20% instead of 30%");
  await page.waitForTimeout(3500); // the slow 25% answer would have arrived by now
  await expect(page.getByTestId("whatif-sentence")).toContainText("With a stop-loss of 20% instead of 30%");
  expect(aborted.length).toBeGreaterThanOrEqual(1);
});

test("condition editor builds the ADX rule as Any of [All of (ADX > 20, ADX rising), ADX > 30]; groups nest at most 4 levels (AC-INP-10)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: "Call", exact: true }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("15");
  await page.getByRole("radio", { name: /^Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /At the money/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "ADX", exact: true }).click();
  await page.getByLabel("ADX Period").fill("14");

  const root = page.locator('[data-depth="1"]');
  await root.getByLabel("Group type").first().selectOption({ label: "Any of these" });
  await root.getByRole("button", { name: "Add group" }).last().click();
  const inner = page.locator('[data-depth="2"]');
  await inner.getByRole("button", { name: "Add condition" }).last().click();
  await inner.getByLabel("What to check").nth(0).selectOption({ label: "ADX 14" });
  await inner.getByLabel("Number").nth(0).fill("20");
  await inner.getByRole("button", { name: "Add condition" }).last().click();
  await inner.getByLabel("What to check").nth(1).selectOption({ label: "ADX 14" });
  await inner.getByLabel("Condition", { exact: true }).nth(1).selectOption({ label: "is rising" });
  await inner.getByLabel("Candles back").fill("1");
  await root.getByRole("button", { name: "Add condition" }).last().click();
  const last = root.getByLabel("What to check").last();
  await last.selectOption({ label: "ADX 14" });
  await root.getByLabel("Number").last().fill("30");
  await expect(page.getByText("Reads as: ADX 14 is above 20")).toBeVisible();
  await expect(page.getByText("Reads as: ADX 14 is rising (vs 1 candle ago)")).toBeVisible();
  await expect(page.getByText("Reads as: ADX 14 is above 30")).toBeVisible();
  const preview = page.getByRole("complementary", { name: "Your strategy so far" });
  await expect(preview).toContainText("Any of these:");
  await expect(preview).toContainText("All of these:");

  // Nesting: groups at depth 3 and 4 can be added; a fifth level is refused.
  await inner.getByRole("button", { name: "Add group" }).last().click();
  await page.locator('[data-depth="3"]').getByRole("button", { name: "Add group" }).last().click();
  const deepest = page.locator('[data-depth="4"]');
  await expect(deepest.getByRole("button", { name: "Add group" })).toBeDisabled();
  await expect(deepest.getByText("Groups can nest up to 4 levels.")).toBeVisible();
});
