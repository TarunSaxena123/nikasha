// Glossary and ⓘ hints open and close predictably (REQ-BEG-10, 11; frontend.md §6), and the builder's
// preview panel shows its rules without clipping (REQ-INP-05).
import { expect, test } from "@playwright/test";
import { acceptGate, mockServices } from "./helpers";

async function toStrikeStep(page: import("@playwright/test").Page) {
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
}

test("hints open on hover or click and close on leave, Esc, outside click and blur", async ({ page }) => {
  await toStrikeStep(page);
  const hint = page.getByTestId("hint");
  const term = page.getByRole("complementary", { name: "Your strategy so far" }).getByRole("button", { name: "Strike" });

  await term.hover();
  await expect(hint).toContainText("ATM / ITM / OTM");
  await page.mouse.move(5, 5);
  await expect(hint).toHaveCount(0);

  await term.click(); // the case from the owner's screenshot: click, then move away
  await expect(hint).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(hint).toHaveCount(0);

  await term.click();
  await page.keyboard.press("Escape");
  await expect(hint).toHaveCount(0);

  await term.click();
  await page.getByRole("heading", { name: "Strike", level: 1 }).click(); // anywhere else
  await expect(hint).toHaveCount(0);

  const info = page.getByRole("button", { name: "About Strike" });
  await info.focus();
  await expect(hint).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(hint).toHaveCount(0);
});

test("builder preview panel has no clipped or scrolled-away columns", async ({ page }) => {
  await toStrikeStep(page);
  const panel = page.getByRole("complementary", { name: "Your strategy so far" });
  await expect(panel.getByRole("columnheader")).toHaveText(["Rule", "Setting"]);
  const overflow = await panel.evaluate((el) => [...el.querySelectorAll("div")].some((d) => d.scrollWidth > d.clientWidth + 1));
  expect(overflow).toBe(false);
});

test("conditions: compare EMA 9 with EMA 21 from one list; an empty number blocks Next and never reads NaN (REQ-INP-12, 13)", async ({ page }) => {
  await toStrikeStep(page);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  for (const period of ["9", "21"]) {
    await page.getByRole("button", { name: "Add indicator" }).click();
    await page.getByRole("button", { name: "EMA", exact: true }).click();
    await page.getByLabel("EMA Period").last().fill(period);
    await page.getByLabel("EMA Price").last().selectOption("close"); // never defaulted
  }
  await page.getByRole("button", { name: "Add condition" }).click();
  await page.getByLabel("What to check").selectOption({ label: "EMA 9 (close)" });
  await expect(page.getByText("Reads as: EMA 9 (close) is above (number not set yet)")).toBeVisible();
  await expect(page.getByTestId("step-needed")).toContainText("Entry conditions");
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  const compare = page.getByLabel("Compare with");
  await expect(compare.locator("option", { hasText: "EMA 21 (close)" })).toHaveCount(1);
  await expect(compare.locator("option", { hasText: "EMA 9 (close)" })).toHaveCount(0); // not against itself
  await compare.selectOption({ label: "EMA 21 (close)" });
  await expect(page.getByText("Reads as: EMA 9 (close) is above EMA 21 (close)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();
  await expect(page.getByText("NaN")).toHaveCount(0);
});

test("Supertrend colour conditions are offered first for a Supertrend and hidden for others (REQ-INP-13, SEM-04)", async ({ page }) => {
  await toStrikeStep(page);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "When conditions are met" }).check();
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "Supertrend", exact: true }).click();
  await page.getByLabel("Supertrend Period").fill("10");
  await page.getByLabel("Supertrend Multiplier").fill("3");
  await page.getByRole("button", { name: "Add indicator" }).click();
  await page.getByRole("button", { name: "EMA", exact: true }).click();
  await page.getByLabel("EMA Period").fill("21");
  await page.getByRole("button", { name: "Add condition" }).click();
  const cond = page.getByLabel("Condition", { exact: true });
  await page.getByLabel("What to check").selectOption({ label: "EMA 21 (price not set)" });
  await expect(cond.locator("option", { hasText: "turns green" })).toHaveCount(0);
  await page.getByLabel("What to check").selectOption({ label: "Supertrend 10 × 3 line" });
  await expect(cond.locator('optgroup[label="Supertrend colour"] option')).toHaveText(["turns green", "turns red", "is green", "is red"]);
  await cond.selectOption({ label: "turns green" });
  await expect(page.getByText("Reads as: Supertrend 10 × 3 turns green")).toBeVisible();
});
