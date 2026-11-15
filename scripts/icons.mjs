/**
 * Writes the icon files from the one drawing in src/lib/mark.ts:
 *
 *   public/icon.svg              the tab icon (vector, with a dark-strip variant)
 *   public/favicon.ico           16, 32 and 48px PNGs, for whatever asks for /favicon.ico
 *   public/apple-touch-icon.png  180px, the mark on paper
 *
 * Rasterised by the Chromium Playwright already installs, so it needs no
 * image library. tests/unit/mark.test.ts fails when icon.svg is stale; run
 * this after changing the mark or its colours.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const { iconSvg, touchIconSvg } = await import('../src/lib/mark.ts');

const icon = iconSvg();
writeFileSync('public/icon.svg', icon);

// The suite's override (playwright.config.ts), for a machine whose browser
// predates the installed Playwright.
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ colorScheme: 'light' });

async function png(svg, size) {
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style><img src="${src}" width="${size}" height="${size}">`
  );
  await page.waitForFunction(() => document.images[0].complete);
  return page.locator('img').screenshot({ omitBackground: true });
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push(await png(icon, size));
writeFileSync('public/apple-touch-icon.png', await png(touchIconSvg(), 180));
await browser.close();

// An ICO is a directory of PNGs: a 6-byte header, a 16-byte entry per image.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((data, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i] % 256, 0);
  e.writeUInt8(sizes[i] % 256, 1);
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += data.length;
  return e;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries, ...images]));
console.log('Wrote public/icon.svg, public/favicon.ico, public/apple-touch-icon.png');
