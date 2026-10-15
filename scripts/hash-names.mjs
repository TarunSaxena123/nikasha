#!/usr/bin/env node
// Reads product names from stdin (one per line) and prints the SHA-256 of each lower-cased,
// whitespace-normalised name. The owner keeps the plain list privately and commits only the
// hashes to specs/contracts/excluded-names.sha256 (feature 07 design §3.2).
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export function normalise(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function hashName(name) {
  return createHash("sha256").update(normalise(name)).digest("hex");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    for (const line of input.split(/\r?\n/)) {
      if (normalise(line)) process.stdout.write(hashName(line) + "\n");
    }
  });
}
