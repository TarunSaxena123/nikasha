import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";

export const CONTRACTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "specs", "contracts");
export const ENGINE = "http://localhost:8000";
export const EXTRACT = "http://localhost:8001";
export const fixture = <T = unknown>(...p: string[]): T => JSON.parse(readFileSync(join(CONTRACTS, "fixtures", ...p), "utf8")) as T;
export const META = fixture("meta.example.json");
export const STF_REPORT = fixture<{ request: unknown; report: Record<string, unknown> }>("reports", "simple-trend-follower-2023-2024.json").report;
export const ZERO_REPORT = fixture<{ report: Record<string, unknown> }>("reports", "zero-trades.json").report;

export interface Mocks {
  evaluate: unknown[]; // request bodies received
  plan: unknown[];
  extract: unknown[];
}

// A request the page has already cancelled can't be answered; that's expected, not a failure.
const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) }).catch(() => undefined);

export async function mockServices(
  page: Page,
  opts: {
    meta?: "ok" | "fail" | "slow";
    evaluate?: (n: number, body: unknown) => Promise<{ status: number; body: unknown; delayMs?: number }> | { status: number; body: unknown; delayMs?: number };
    plan?: (body: unknown) => { status: number; body: unknown };
    extract?: (n: number) => { status: number; body: unknown; delayMs?: number };
  } = {},
): Promise<Mocks> {
  const m: Mocks = { evaluate: [], plan: [], extract: [] };
  await page.route(`${ENGINE}/v1/meta`, async (route) => {
    if (opts.meta === "fail") return json(route, 500, { error: { code: "ENGINE_ERROR", message: "x" } });
    if (opts.meta === "slow") await new Promise((r) => setTimeout(r, 2500));
    return json(route, 200, META);
  });
  await page.route(`${ENGINE}/v1/evaluate`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" } });
    const body = route.request().postDataJSON();
    m.evaluate.push(body);
    const r = opts.evaluate ? await opts.evaluate(m.evaluate.length, body) : { status: 200, body: STF_REPORT };
    if (r.delayMs) await new Promise((res) => setTimeout(res, r.delayMs));
    return json(route, r.status, r.body);
  });
  await page.route(`${ENGINE}/v1/suggestions/plan`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" } });
    const body = route.request().postDataJSON();
    m.plan.push(body);
    const r = opts.plan ? opts.plan(body) : { status: 200, body: { variants: [], not_offered_text: "No ideas apply to this strategy's settings." } };
    return json(route, r.status, r.body);
  });
  await page.route(`${EXTRACT}/v1/extract`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" } });
    m.extract.push(route.request().postData());
    const r = opts.extract ? opts.extract(m.extract.length) : { status: 200, body: fixture("extraction", "one-line-sample.json") };
    if (r.delayMs) await new Promise((res) => setTimeout(res, r.delayMs));
    return json(route, r.status, r.body);
  });
  return m;
}

/** Accept the disclaimer through the real gate UI on a gated page. */
export async function acceptGate(page: Page) {
  const box = page.getByRole("checkbox", { name: "I understand and agree" });
  const main = page.locator("main#main");
  await main.first().waitFor();
  if (!(await box.isVisible())) return; // already accepted in this browser
  await box.check();
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function startAccepted(page: Page, path = "/start") {
  await page.goto(path);
  await acceptGate(page);
}
