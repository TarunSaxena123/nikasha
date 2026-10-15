#!/usr/bin/env node
// Fails when any 1-, 2- or 3-word sequence in the app source, specs, docs or README hashes to an
// entry in specs/contracts/excluded-names.sha256 (REQ-PRV-34, feature 07 design §3.2).
// Usage: node scripts/check-names.mjs            scan the repo
//        node scripts/check-names.mjs --self-test prove a planted test name is caught
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashName, normalise } from "./hash-names.mjs";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const HASH_FILE = join(ROOT, "specs/contracts/excluded-names.sha256");
const SCAN_DIRS = ["specs", "docs", "web/src", "web/content", "engine/nikasha_engine", "extractor/nikasha_extractor", "pylib", "instruments", "scripts"];
const SCAN_FILES = ["README.md", "CLAUDE.md"];
const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".js", ".mjs", ".json", ".yaml", ".yml", ".py", ".txt", ".css", ".html", ".mdx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".venv", "__pycache__", "generated", "out", "dist"]);
const SELF_TEST_NAME = "nikasha selftest product";

export function loadHashes(text) {
  return new Set(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[0-9a-f]{64}$/.test(l)));
}

export function findMatches(text, hashes) {
  const words = normalise(text).split(" ").filter(Boolean);
  const hits = new Set();
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 3 && i + n <= words.length; n++) {
      const phrase = words.slice(i, i + n).join(" ");
      if (hashes.has(hashName(phrase))) hits.add(hashName(phrase).slice(0, 12));
    }
  }
  return [...hits];
}

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (TEXT_EXT.has(extname(name))) yield p;
  }
}

function main() {
  if (process.argv.includes("--self-test")) {
    const hashes = new Set([hashName(SELF_TEST_NAME)]);
    const ok = findMatches(`Text naming Nikasha-SelfTest product here.`, hashes).length === 1
      && findMatches("Clean text with no names.", hashes).length === 0;
    console.log(ok ? "check-names self-test passed" : "check-names self-test FAILED");
    process.exit(ok ? 0 : 1);
  }
  const hashes = loadHashes(readFileSync(HASH_FILE, "utf8"));
  const files = [...SCAN_FILES.map((f) => join(ROOT, f)), ...SCAN_DIRS.flatMap((d) => [...walk(join(ROOT, d))])];
  let failed = false;
  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const hits = findMatches(text, hashes);
    if (hits.length) {
      failed = true;
      console.log(`${relative(ROOT, f)}: excluded product name found (hash ${hits.join(", ")})`);
    }
  }
  console.log(failed ? "check-names: FAILED" : `check-names: ${files.length} files clean`);
  process.exit(failed ? 1 : 0);
}

main();
