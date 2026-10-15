// Renders the tab icon (src/app/icon.svg) to favicon.ico (16/32/48) and apple-icon.png (180),
// using the browser Playwright already installs. Run after changing the icon: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync(new URL("../src/app/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(size, background = "transparent") {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${background}">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  return page.screenshot({ omitBackground: background === "transparent", clip: { x: 0, y: 0, width: size, height: size } });
}
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await png(s));
// ICO = header + one directory entry per image + the PNG data (PNG-in-ICO is supported by all current browsers).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(new URL("../src/app/favicon.ico", import.meta.url), Buffer.concat([header, ...dir, ...pngs]));
writeFileSync(new URL("../src/app/apple-icon.png", import.meta.url), await png(180, "#2B2F36"));
await browser.close();
console.log("wrote src/app/favicon.ico (16, 32, 48) and src/app/apple-icon.png (180)");
