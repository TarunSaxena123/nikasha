// Generates web/src/generated/ from specs/contracts (T-EVL-08; architecture.md §2: contracts are
// consumed, never copied by hand). `--check` fails when the committed files are out of date.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile } from "json-schema-to-typescript";
import openapiTS, { astToString } from "openapi-typescript";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS = join(WEB, "..", "specs", "contracts");
const OUT = join(WEB, "src", "generated");
const BANNER = "// Generated from specs/contracts by web/scripts/codegen.mjs. Do not edit by hand.\n";
const check = process.argv.includes("--check");

const read = (name) => readFileSync(join(CONTRACTS, name), "utf8");

async function build() {
  const files = {};
  const strategySchema = JSON.parse(read("strategy.schema.json"));
  const instrumentSchema = JSON.parse(read("instrument.schema.json"));
  const opts = { bannerComment: BANNER.trim(), additionalProperties: false, style: { printWidth: 120 } };
  files["strategy.ts"] = await compile(strategySchema, "Strategy", opts);
  files["instrument.ts"] = await compile(instrumentSchema, "InstrumentProfile", opts);
  const ast = await openapiTS(pathToFileURL(join(CONTRACTS, "api.openapi.yaml")));
  files["api.ts"] = BANNER + astToString(ast);
  files["advanced-options.json"] = read("advanced-options.json");
  files["strategy.schema.json"] = read("strategy.schema.json");

  const ajv = new Ajv2020({ code: { source: true, esm: true, lines: true }, allErrors: true, strict: false });
  const validate = ajv.compile(strategySchema);
  // Ajv's standalone output still calls require() for its unicode string-length helper; inline it so the
  // validator is a pure ES module (works in Next.js and Vitest alike).
  const UCS2 =
    "function ucs2length(str) { const len = str.length; let length = 0; let pos = 0; let value; " +
    "while (pos < len) { length++; value = str.charCodeAt(pos++); " +
    "if (value >= 0xd800 && value <= 0xdbff && pos < len) { value = str.charCodeAt(pos); " +
    "if ((value & 0xfc00) === 0xdc00) pos++; } } return length; }";
  let code = standaloneCode(ajv, validate).replace(/require\("ajv\/dist\/runtime\/ucs2length"\)\.default/g, `(${UCS2})`);
  code = code.replace('"use strict";', "");
  if (/require\(/.test(code)) throw new Error("validator still has a require() call");
  files["validateStrategy.js"] = BANNER + "/* eslint-disable */\n// @ts-nocheck\n" + code;
  files["validateStrategy.d.ts"] =
    BANNER +
    "import type { ErrorObject } from \"ajv\";\n" +
    "declare const validate: ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };\n" +
    "export default validate;\n";
  // Learn articles (feature 05): bundled so open pages and the progress screen share one source.
  const learnDir = join(WEB, "src", "content", "learn");
  const { readdirSync } = await import("node:fs");
  const articles = readdirSync(learnDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const raw = readFileSync(join(learnDir, f), "utf8");
      const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!m) throw new Error(`${f}: missing front-matter`);
      const fm = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
      return { slug: f.replace(/\.md$/, ""), title: fm.title, summary: fm.summary, minutes: Number(fm.minutes), body: m[2].trim() };
    });
  files["learn.json"] = JSON.stringify(articles, null, 1) + "\n";
  return files;
}

const files = await build();
const stale = [];
mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  const path = join(OUT, name);
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(name);
  } else {
    writeFileSync(path, content);
  }
}
if (stale.length) {
  console.log("Generated web files are out of date: " + stale.join(", ") + ". Run npm run codegen.");
  process.exit(1);
}
console.log(check ? "generated web files current" : "generated web files written");
