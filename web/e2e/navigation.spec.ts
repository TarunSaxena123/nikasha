// REQ-BEG-19 / AC-BEG-14: every page but the intro has a Back link to its parent in the flow (frontend.md §2.1).
import { expect, test, type Page } from "@playwright/test";
import { acceptGate, fixture, mockServices } from "./helpers";

const back = (page: Page) => page.getByTestId("back-link");

async function expectBack(page: Page, label: string, href: RegExp) {
  await expect(back(page)).toHaveText(`← Back to ${label}`);
  await expect(back(page)).toHaveAttribute("href", href);
}

test("open pages: Learn, an article and the disclaimer (AC-BEG-14) @phone", async ({ page }) => {
  await page.goto("/");
  await expect(back(page)).toHaveCount(0); // the intro is the top of the flow
  await page.goto("/learn");
  await expectBack(page, "intro", /^\/$/);
  await page.getByRole("link", { name: /drawdown/i }).first().click();
  await expectBack(page, "Learn", /^\/learn\/?$/);
  await back(page).click();
  await expect(page).toHaveURL(/\/learn\/?$/);
  await page.goto("/disclaimer");
  await expectBack(page, "intro", /^\/$/);
});

test("strategy pages lead back along the flow, keeping the draft and report (AC-BEG-14)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/start");
  await acceptGate(page);
  await expectBack(page, "intro", /^\/$/);
  await page.getByRole("link", { name: "See templates" }).click();
  await expectBack(page, "Choose a path", /^\/start\/?$/);
  await back(page).click();
  await expect(page).toHaveURL(/\/start\/?$/);
  await page.getByRole("link", { name: "Start building" }).click();
  await expectBack(page, "Choose a path", /^\/start\/?$/);
  await page.goto("/start");
  await acceptGate(page);
  await page.getByRole("link", { name: "Upload or paste" }).click();
  await expectBack(page, "Choose a path", /^\/start\/?$/);

  // Template → review → report → back to review → View report: nothing is lost.
  await page.getByRole("link", { name: "Back to Choose a path" }).click();
  await page.getByRole("link", { name: "See templates" }).click();
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await expectBack(page, "templates", /^\/templates\/?$/);
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(0);
  await page.getByRole("button", { name: "Evaluate Strategy" }).click();
  await expect(page.getByTestId("report")).toBeVisible();
  await expectBack(page, "review", /^\/review\/?$/);
  await back(page).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="lot_size"]')).toContainText("1 lot × 65");
  await page.getByRole("link", { name: "View report" }).click();
  await expect(page.getByTestId("report")).toBeVisible();

  // Builder opened from review: Back to review; a changed draft no longer offers the old report.
  await back(page).click();
  await page.locator('[data-rule="stop_loss"]').getByRole("link", { name: /Edit/ }).click();
  await expectBack(page, "review", /^\/review\/?$/);
  await page.getByLabel("Stop-loss value").fill("25");
  await back(page).click();
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(0);
});

test("builder steps lead back one step; review of a built strategy leads to the builder (AC-BEG-14)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await expectBack(page, "Choose a path", /^\/start\/?$/);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: "Call", exact: true }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("CURRENT_WEEKLY");
  await page.getByTestId("timeframe").selectOption("5");
  await page.getByRole("radio", { name: /Intraday/ }).click();
  await page.getByTestId("prefill-number-of-lots").getByRole("button", { name: "Confirm" }).click();
  await page.getByTestId("prefill-lot-size").getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expectBack(page, "Basics", /\/build\?step=basics$/);
  await back(page).click();
  await expect(page).toHaveURL(/step=basics/);
  await expect(page.getByLabel("Expiry", { exact: true })).toHaveValue("CURRENT_WEEKLY"); // the draft is kept
});

test("review of an upload leads back to the upload with the answers kept (AC-BEG-14)", async ({ page }) => {
  await mockServices(page, { extract: () => ({ status: 200, body: fixture("extraction", "one-line-sample.json") }) });
  await page.goto("/upload");
  await acceptGate(page);
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByTestId("paste").fill("Buy ATM Nifty call when RSI 14 crosses above 60 on 5-minute chart, stop-loss 30%.");
  await page.getByRole("button", { name: "Read my strategy" }).click();
  await page.getByRole("button", { name: "Answer 4 questions" }).click();
  const q = page.getByTestId("question");
  await q.getByLabel("Current weekly").check();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("radio", { name: /^Intraday/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await q.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Review & Evaluate" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expectBack(page, "upload", /^\/upload\/?$/);
  await back(page).click();
  await expect(page.getByTestId("found")).toContainText("30% of the option premium"); // the result is restored
  await page.getByRole("button", { name: "Answer 4 questions" }).click();
  await expect(q.getByLabel("Current weekly")).toBeChecked();
});

async function startBuilding(page: Page) {
  await mockServices(page);
  await page.goto("/build");
  await acceptGate(page);
  await page.getByRole("radio", { name: "Buy options" }).click();
  await page.getByRole("radio", { name: "Call", exact: true }).click();
  await page.getByLabel("Expiry", { exact: true }).selectOption("NEXT_WEEKLY");
}

test("leaving through the logo keeps the work; Continue returns to it (AC-BEG-15)", async ({ page }) => {
  await startBuilding(page);
  await page.getByRole("link", { name: /^Nikasha/ }).click();
  await expect(page).toHaveURL(/\/$/);
  const panel = page.getByTestId("continue-panel");
  await expect(panel).toContainText("Continue where you left off");
  await panel.getByRole("link", { name: "Continue building" }).click();
  await expect(page).toHaveURL(/\/build/);
  await expect(page.getByLabel("Expiry", { exact: true })).toHaveValue("NEXT_WEEKLY");
  await expect(page.getByRole("radio", { name: "Call", exact: true })).toBeChecked();
});

test("replacing the held strategy asks first; Keep changes nothing (AC-BEG-16)", async ({ page }) => {
  await startBuilding(page);
  await page.getByRole("link", { name: /^Nikasha/ }).click(); // in-app navigation keeps the tab's memory
  await page.getByTestId("continue-panel").waitFor();
  await page.getByRole("link", { name: "Get started" }).first().click();
  await page.getByRole("link", { name: "See templates" }).click();
  const card = page.getByTestId("template-simple-trend-follower");
  await card.getByRole("button", { name: "Use this template" }).click();
  const dialog = page.getByTestId("replace-dialog");
  await expect(dialog).toContainText("Replace your current strategy?");
  await dialog.getByRole("button", { name: "Keep my strategy" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/templates/);
  await page.getByRole("link", { name: /^Back to Choose a path/ }).click();
  await expect(page.getByTestId("continue-panel")).toContainText("Continue building"); // still the builder draft
  await page.getByRole("link", { name: "See templates" }).click();
  await card.getByRole("button", { name: "Use this template" }).click();
  await page.getByTestId("replace-dialog").getByRole("button", { name: "Replace" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('[data-rule="entry_windows"]')).toContainText("09:30–14:30");
});

test("with nothing held, no question and no panel (AC-BEG-16)", async ({ page }) => {
  await mockServices(page);
  await page.goto("/start");
  await acceptGate(page);
  await expect(page.getByTestId("continue-panel")).toHaveCount(0);
  await page.getByRole("link", { name: "See templates" }).click();
  await page.getByTestId("template-simple-trend-follower").getByRole("button", { name: "Use this template" }).click();
  await expect(page).toHaveURL(/\/review$/);
});
