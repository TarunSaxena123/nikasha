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
