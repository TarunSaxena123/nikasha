// Remaining behaviours: console privacy, leave warning, notification, builder advanced/multi-leg/mirror,
// unsupported acknowledgement through to review.
import { expect, test, type Page } from "@playwright/test";
import { acceptGate, fixture, mockServices } from "./helpers";

const MARK = "NIKASHA-PRIVACY-MARKER-7f3a";

async function toBuilder(page: Page) {
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Customize" }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
}

test("no user content in the browser console (REQ-PRV-28)", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.text()));
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "one-line-sample.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill(`Buy ATM Nifty call when RSI 14 crosses above 60. ${MARK}`);
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await expect(page.getByTestId("found")).toBeVisible();
  expect(logs.join("\n")).not.toContain(MARK);
});

test("leave-page warning while a report exists; ready notification when permitted (REQ-EVL-10, 12; AC-EVL-08)", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.addInitScript(() => {
    const shown: string[] = [];
    (window as unknown as { __notes: string[] }).__notes = shown;
    class FakeNotification {
      static permission = "granted";
      static requestPermission = () => Promise.resolve("granted");
      constructor(title: string) {
        shown.push(title);
      }
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
  await mockServices(page);
  await page.goto("/templates");
  await acceptGate(page);
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __notes: string[] }).__notes)).toEqual(["Your Nikasha report is ready"]);
  let warned = false;
  page.on("dialog", async (d) => {
    warned = d.type() === "beforeunload";
    await d.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => warned).toBe(true);
});

test("advanced options: all off, empty when on, removed when off, VIX band gap message (AC-INP-13)", async ({ page }) => {
  await mockServices(page);
  await toBuilder(page);
  await page.goto("about:blank");
  await toBuilder(page);
  await page.getByRole("button", { name: /Advanced options/ }).first().click();
  await expect(page).toHaveURL(/step=advanced/);
  const switches = page.getByRole("switch");
  await expect(switches).toHaveCount(13);
  await expect(page.getByRole("switch", { name: "SL cap" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: /^Entry windows/ })).toBeChecked(); // the template uses it
  await page.getByRole("switch", { name: "SL cap" }).click();
  await expect(page.getByLabel("SL cap points")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Review strategy" })).toHaveCount(0);
  await page.getByRole("switch", { name: "SL cap" }).click();
  await expect(page.getByLabel("SL cap points")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review strategy" })).toBeVisible();
  await page.getByRole("switch", { name: "Volatility (VIX) sizing" }).click();
  await page.getByLabel("VIX at the day's open").check();
  await page.getByLabel("Band 1 to").fill("12");
  await page.getByLabel("Band 1 size").fill("50");
  await page.getByRole("button", { name: "Add band" }).click();
  await page.getByLabel("Band 2 from").fill("14");
  await page.getByLabel("Band 2 size").fill("100");
  await expect(page.getByTestId("step-needed")).toContainText("every VIX level, with no gaps or overlaps");
});

test("multi-leg: sell CE + PE ATM at 09:20 equals the straddle template; combined-stop note (AC-INP-14)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await page.getByRole("radio", { name: "Sell options" }).click();
  await page.getByRole("radio", { name: "Call", exact: true }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("5");
  await page.getByRole("radio", { name: /Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /At the money/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "At a fixed time", exact: true }).check();
  await page.locator('input[aria-label="Entry time"]').fill("09:20");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Stop-loss type").selectOption("PCT_PREMIUM");
  await page.getByLabel("Stop-loss value").fill("30");
  await page.getByRole("button", { name: /Advanced options/ }).last().click();
  await page.getByRole("switch", { name: "Multiple legs" }).click();
  await expect(page.getByText(/stop-loss and target apply to the combined position/)).toBeVisible();
  await page.getByLabel("Leg 1 call or put").selectOption("CE");
  await page.getByLabel("Leg 2 buy or sell").selectOption("SELL");
  await page.getByLabel("Leg 2 call or put").selectOption("PE");
  await page.getByLabel("Leg 2 strike").selectOption("ATM");
  await page.getByRole("button", { name: "Review strategy" }).click();
  await expect(page.locator('[data-rule="multiple_legs"]')).toContainText("2 legs, opened together with one combined stop-loss: Sell call, at the money; Sell put, at the money");
  await expect(page.locator('[data-rule="stop_loss"]')).toContainText("30% of the combined premium");
});

test("Mirror from Call flips directions and highlights copied numbers; MACD message beside fields (AC-INP-11, 15)", async ({ page }) => {
  await mockServices(page);
  await toBuilder(page);
  await page.getByRole("button", { name: /3 Entry/ }).click();
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "RSI" }).click();
  await page.getByRole("button", { name: "14", exact: true }).click();
  const callSide = page.locator("[data-depth='1']").first();
  await callSide.getByRole("button", { name: "Add condition" }).click();
  await callSide.getByLabel("What to check").last().selectOption({ label: "RSI 14" });
  await callSide.getByLabel("Number").last().fill("55");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Mirror from Call" }).click();
  await expect(page.getByText("Reads as: EMA 9 (close) crosses below EMA 21 (close)").first()).toBeVisible();
  await expect(page.getByText("Reads as: RSI 14 is below 55")).toBeVisible();
  await expect(page.getByText(/copied unchanged from the call side/)).toBeVisible();
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "MACD" }).click();
  await page.getByLabel("MACD Fast").fill("26");
  await page.getByLabel("MACD Slow").fill("12");
  await page.getByLabel("MACD Signal").fill("9");
  await expect(page.getByTestId("step-needed")).toContainText("MACD fast period must be shorter than the slow period.");
});

test("unsupported rule: acknowledgement required, then listed on review (AC-UPL-12)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "vwap.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM call when price crosses above VWAP, SL 20 points");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await page.getByRole("button", { name: /Answer 4 questions/ }).click();
  const q = page.getByTestId("question");
  await q.getByLabel("Current weekly").check();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("radio", { name: /^Intraday/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Continue in the builder" }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("I understand these rules will be left out of the test.").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/build\?step=entry/);
  await page.getByRole("radio", { name: "At a fixed time", exact: true }).check();
  await page.locator('input[aria-label="Entry time"]').fill("10:00");
  await page.getByRole("button", { name: "Review strategy" }).click();
  await expect(page.getByTestId("left-out")).toContainText("no volume and no VWAP");
});
