#!/usr/bin/env node
// Writes the full disclaimer (product.md §11.1) into README.md between the markers, with the data
// dates read from data/nifty50_1min_clean.csv (T-PRV-21, REQ-PRV-10, 17, 18).
// Usage: node scripts/sync-readme-disclaimer.mjs [--check]
import { readFileSync, writeFileSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const START = "<!-- DISCLAIMER:START -->";
const END = "<!-- DISCLAIMER:END -->";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function dataRange(csvPath) {
  const fd = openSync(csvPath, "r");
  const head = Buffer.alloc(256);
  readSync(fd, head, 0, 256, 0);
  const size = statSync(csvPath).size;
  const tail = Buffer.alloc(Math.min(512, size));
  readSync(fd, tail, 0, tail.length, size - tail.length);
  closeSync(fd);
  const first = head.toString().split("\n")[1].split(",")[0];
  const lines = tail.toString().trim().split("\n");
  const last = lines[lines.length - 1].split(",")[0];
  return { first: formatDate(first), last: formatDate(last) };
}

export function disclaimerMarkdown(productMd, range) {
  const section = productMd.slice(productMd.indexOf("### 11.1 Full disclaimer"));
  const lines = section.split("\n");
  const start = lines.findIndex((l) => l.startsWith(">"));
  const out = [];
  for (let i = start; i < lines.length && lines[i].startsWith(">"); i++) out.push(lines[i]);
  return out
    .join("\n")
    .replace("[first date]", range.first)
    .replace("[last date]", range.last)
    .replace(" (filled in automatically from the data)", "");
}

function main() {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const product = readFileSync(join(ROOT, "specs", "product.md"), "utf8");
  const block = disclaimerMarkdown(product, dataRange(join(ROOT, "data", "nifty50_1min_clean.csv")));
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < 0) {
    console.error("README.md has no disclaimer markers");
    process.exit(1);
  }
  const next = readme.slice(0, a + START.length) + "\n" + block + "\n" + readme.slice(b);
  const required = ["## What Nikasha is", "## Run it locally", "## Deploy", "## Assumptions", "## Limitations", "## Add an instrument", "## Disclaimer"];
  const missingHeadings = required.filter((h) => !readme.includes(`\n${h}\n`));
  if (missingHeadings.length) {
    console.error("README is missing sections: " + missingHeadings.join(", "));
    process.exit(1);
  }
  if (process.argv.includes("--check")) {
    if (next !== readme) {
      console.error("README disclaimer is out of date. Run: node scripts/sync-readme-disclaimer.mjs");
      process.exit(1);
    }
    console.log("README disclaimer in sync");
    return;
  }
  writeFileSync(join(ROOT, "README.md"), next);
  console.log("README disclaimer written");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
