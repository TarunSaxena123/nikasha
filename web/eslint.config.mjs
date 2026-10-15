import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const storageBan = {
  "no-restricted-globals": [
    "error",
    { name: "localStorage", message: "Only src/legal/consent.ts may use browser storage (REQ-PRV-21)." },
    { name: "sessionStorage", message: "No session storage in Nikasha (REQ-PRV-21)." },
    { name: "indexedDB", message: "No IndexedDB in Nikasha (REQ-PRV-21)." },
  ],
  "no-restricted-properties": [
    "error",
    { object: "window", property: "localStorage", message: "Only src/legal/consent.ts may use browser storage." },
    { object: "window", property: "sessionStorage", message: "No session storage in Nikasha." },
    { object: "document", property: "cookie", message: "No cookies in Nikasha (REQ-PRV-22)." },
  ],
  "no-console": "error",
};

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "src/generated/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: storageBan },
  // consent.ts is the one storage module; its own tests inspect what it stored.
  { files: ["src/legal/consent.ts", "src/legal/legal.test.ts"], rules: { "no-restricted-globals": "off", "no-restricted-properties": "off" } },
  { files: ["scripts/**", "e2e/**", "**/*.test.ts", "**/*.test.tsx", "*.config.*"], rules: { "no-console": "off" } },
  // E2E tests inspect the browser storage to prove nothing else is stored.
  { files: ["e2e/**"], rules: { "no-restricted-properties": "off" } },
];

export default config;
