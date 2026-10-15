// T-INP-01 (AC-INP-03): the web validator agrees with the engine on every shared fixture,
// with the same rule ids and the same plain-English messages.
import { describe, expect, it } from "vitest";
import type { InstrumentSummary } from "@/api/types";
import { validate } from "@/strategy/validate";
import { list, meta, readJson, validStrategy } from "@/test/fixtures";

const DEFAULT_PERIOD = { start: "2024-01-01", end: "2024-12-31" };
const expected = readJson<Record<string, { rule?: string; field_label: string; message: string }[]>>(
  "fixtures",
  "strategies",
  "expected-problems.json",
);

describe("shared strategy fixtures", () => {
  it.each(list("fixtures", "strategies", "valid"))("valid: %s", (name) => {
    expect(validate(validStrategy(name), { meta: meta(), period: DEFAULT_PERIOD })).toEqual([]);
  });

  it.each(list("fixtures", "strategies", "invalid"))("invalid: %s", (name) => {
    const c = readJson<{
      strategy: unknown;
      settings?: { period: { start: string; end: string } };
      profile_overrides?: Partial<InstrumentSummary>;
      expect: { kind: string; rules: string[] };
    }>("fixtures", "strategies", "invalid", `${name}.json`);
    const probs = validate(c.strategy, {
      meta: meta(),
      period: c.settings?.period ?? DEFAULT_PERIOD,
      instrumentOverride: c.profile_overrides,
    });
    expect(probs.filter((p) => p.rule).map((p) => p.rule)).toEqual(c.expect.rules);
    const engine = expected[name]!;
    expect(probs.map((p) => ({ field_label: p.field_label, message: p.message }))).toEqual(
      engine.map((p) => ({ field_label: p.field_label, message: p.message })),
    );
  });
});
