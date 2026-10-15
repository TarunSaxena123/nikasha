// Test helpers: read the shared contract fixtures straight from specs/contracts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { MetaResponse, Report, Strategy } from "@/api/types";

export const CONTRACTS = join(__dirname, "..", "..", "..", "specs", "contracts");
export const readJson = <T>(...parts: string[]): T => JSON.parse(readFileSync(join(CONTRACTS, ...parts), "utf8")) as T;
export const meta = (): MetaResponse => readJson<MetaResponse>("fixtures", "meta.example.json");
export const validStrategy = (name: string): Strategy => readJson<Strategy>("fixtures", "strategies", "valid", `${name}.json`);
export const reportFixture = (name: string): { request: unknown; report: Report } =>
  readJson("fixtures", "reports", `${name}.json`);
export const list = (...parts: string[]): string[] =>
  readdirSync(join(CONTRACTS, ...parts)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
export const bannedPhrases = (): string[] =>
  readFileSync(join(CONTRACTS, "banned-phrases.txt"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#"));
