/**
 * Writes the site's images from their one source each:
 *
 *   public/icon.svg              the tab icon, from src/lib/mark.ts (vector, with a dark-strip variant)
 *   public/favicon.ico           16, 32 and 48px PNGs of it, for whatever asks for /favicon.ico
 *   public/apple-touch-icon.png  180px, the mark on paper
 *   public/share/<card>.png      the share cards, captured from /share/<card> (src/lib/share.ts)
 *
 * The cards are pages, so they are captured from the built site: run
 * `npm run build` first, and this serves `dist` with `astro preview` while
 * it works. Rasterised by the Chromium Playwright already installs, so it
 * needs no image library. tests/unit/mark.test.ts fails when icon.svg is
 * stale; run this after changing the mark, the chart, a token, or the copy a
 * card shows.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

if (!existsSync('dist')) {
  console.error('No dist/. Run `npm run build` first: the share cards are captured from the built site.');
  process.exit(1);
}

const { iconSvg, touchIconSvg } = await import('../src/lib/mark.ts');
const { SHARE_CARDS, SHARE_SIZE, sharePagePath, shareImagePath } = await import('../src/lib/share.ts');

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

// The share cards, from the preview server.
const PORT = 9013;
const origin = `http://127.0.0.1:${PORT}`;
// Something already answering would be captured instead of this build.
if (await fetch(origin).then(() => true, () => false)) {
  console.error(`Port ${PORT} is in use; stop whatever is serving it and run again.`);
  process.exit(1);
}
// Its own process group, so stopping it stops the server npx starts under it.
const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  stdio: 'ignore',
  detached: true,
});
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin + sharePagePath('site'))).ok) break;
    } catch {
      // Not listening yet.
    }
    if (i > 60) throw new Error('astro preview did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  const cards = await browser.newPage({
    viewport: { width: SHARE_SIZE.width / 2, height: SHARE_SIZE.height / 2 },
    deviceScaleFactor: 2,
  });
  mkdirSync('public/share', { recursive: true });
  for (const card of SHARE_CARDS) {
    await cards.goto(origin + sharePagePath(card), { waitUntil: 'networkidle' });
    await cards.evaluate(() => document.fonts.ready);
    writeFileSync('public' + shareImagePath(card), await cards.screenshot());
  }
} finally {
  process.kill(-preview.pid);
}
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
console.log('Wrote public/icon.svg, public/favicon.ico, public/apple-touch-icon.png and public/share/*.png');
