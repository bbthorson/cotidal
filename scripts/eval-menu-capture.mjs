#!/usr/bin/env node
/**
 * Menu capture evaluation harness for Cotidal.
 *
 * Usage:
 *   npx tsx scripts/eval-menu-capture.mjs --mode local
 *   npx tsx scripts/eval-menu-capture.mjs --mode live --url http://localhost:9002 [--cookie "..."] [--vision] [--bar bar-madonna]
 *   npx tsx scripts/eval-menu-capture.mjs --mode live --url http://localhost:9002 --image ./menu.png
 *
 * Modes:
 * - `local`: runs the deterministic pipeline (`captureMenuLines` + `summarizeCoverage`)
 *   against `tests/fixtures/williamsburg-menus.json` with zero network calls.
 * - `live`: posts text or menu photos (`--vision` / `--image`) to `POST /api/menu/capture`.
 */

import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const FIXTURE_PATH = resolve(process.cwd(), 'tests/fixtures/williamsburg-menus.json');

function parseArgs(argv) {
  const args = {
    mode: 'local',
    url: 'http://localhost:9002',
    cookie: process.env.COTIDAL_COOKIE || '',
    bar: '',
    vision: false,
    image: '',
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode' && argv[i + 1]) args.mode = argv[++i];
    else if (a === '--url' && argv[i + 1]) args.url = argv[++i];
    else if (a === '--cookie' && argv[i + 1]) args.cookie = argv[++i];
    else if (a === '--bar' && argv[i + 1]) args.bar = argv[++i];
    else if (a === '--image' && argv[i + 1]) args.image = argv[++i];
    else if (a === '--vision') args.vision = true;
    else if (a === '--json') args.json = true;
  }
  return args;
}

function mimeForPath(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function checkAssertions(bar, items) {
  const failures = [];
  for (const a of bar.assertions ?? []) {
    const item = items.find((i) => i.label.toLowerCase() === a.label.toLowerCase());
    if (!item) {
      failures.push(`${bar.id}: missing item "${a.label}"`);
      continue;
    }
    const quadrant = item.directional?.quadrant ?? item.catalogQuadrant ?? null;
    const placed = Boolean(item.drinkName || item.directional);
    if (a.placed === true && !placed) {
      failures.push(`${bar.id} / ${a.label}: expected placed, got unplaced`);
    }
    if (a.quadrant && quadrant !== a.quadrant) {
      failures.push(`${bar.id} / ${a.label}: expected quadrant "${a.quadrant}", got "${quadrant}"`);
    }
    if (a.nonAlcoholic === true && !item.nonAlcoholic) {
      failures.push(`${bar.id} / ${a.label}: expected nonAlcoholic=true`);
    }
    if ('closestClassic' in a) {
      const actual = item.directional?.closestClassicName ?? null;
      if (actual !== a.closestClassic) {
        failures.push(
          `${bar.id} / ${a.label}: expected closestClassic=${JSON.stringify(a.closestClassic)}, got ${JSON.stringify(actual)}`
        );
      }
    }
    if (a.aversions) {
      const av = item.directional?.aversions ?? { smoke: false, bitter: false, anise: false };
      for (const [k, expected] of Object.entries(a.aversions)) {
        if (av[k] !== expected) {
          failures.push(`${bar.id} / ${a.label}: expected aversion ${k}=${expected}, got ${av[k]}`);
        }
      }
    }
    if (a.excludePrimitives && Array.isArray(item.primitives)) {
      for (const forbidden of a.excludePrimitives) {
        if (item.primitives.includes(forbidden)) {
          failures.push(`${bar.id} / ${a.label}: primitive "${forbidden}" should not have matched`);
        }
      }
    }
  }
  return failures;
}

async function runLocal(bars) {
  const [{ captureMenuLines }, { summarizeCoverage }, { quadrantIdFor }] = await Promise.all([
    import('../src/lib/drinks/menu-capture.ts'),
    import('../src/lib/drinks/menu-audit.ts'),
    import('../src/lib/map/coordinates.ts'),
  ]);

  const reports = [];
  const allFailures = [];

  for (const bar of bars) {
    const rawItems = captureMenuLines(bar.lines ?? [], {});
    const coverage = summarizeCoverage(rawItems);
    const items = rawItems.map((i) => ({
      label: i.label,
      section: i.section,
      price: i.price,
      nonAlcoholic: Boolean(i.nonAlcoholic),
      drinkName: i.drink?.name ?? null,
      catalogQuadrant: i.drink ? quadrantIdFor(i.drink.x, i.drink.y) : null,
      primitives: i.directional?.primitives.map((p) => p.id) ?? [],
      directional: i.directional
        ? {
            x: i.directional.x,
            y: i.directional.y,
            quadrant: i.directional.quadrant,
            confidence: i.directional.confidence,
            aversions: i.directional.aversions,
            closestClassicName: i.directional.closestClassic?.name ?? null,
          }
        : null,
    }));

    const failures = checkAssertions(bar, items);
    allFailures.push(...failures);

    const catalogCount = items.filter((i) => i.drinkName).length;
    const directionalCount = items.filter((i) => !i.drinkName && i.directional).length;
    const unplacedCount = items.filter((i) => !i.drinkName && !i.directional).length;
    const naItems = items.filter((i) => i.nonAlcoholic);
    const naLeaks = naItems.filter((i) => i.directional?.closestClassicName).length;

    reports.push({
      bar: bar.name,
      id: bar.id,
      menuStyle: bar.menuStyle,
      total: items.length,
      catalogCount,
      directionalCount,
      placedCount: coverage.placedCount,
      unplacedCount,
      naCount: naItems.length,
      naAlcoholicClassicLeaks: naLeaks,
      coverage: Object.fromEntries(coverage.coverage.map((c) => [c.id, c.count])),
      blindSpots: coverage.blindSpots.map((b) => b.id),
      failures,
    });
  }

  return { mode: 'local', reports, failures: allFailures };
}

async function fetchImageBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch menu image ${url} (${res.status})`);
  const contentType = res.headers.get('content-type') || 'image/png';
  const mimeType = contentType.includes('jpeg') || contentType.includes('jpg')
    ? 'image/jpeg'
    : contentType.includes('webp')
      ? 'image/webp'
      : 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  return { image: buf.toString('base64'), mimeType };
}

async function postCapture(endpoint, payload, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/menu/capture`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const outcome = res.headers.get('x-generation') || 'unknown';
  const body = await res.json();
  return { status: res.status, outcome, body };
}

async function runLive(bars, args) {
  const reports = [];
  const allFailures = [];

  if (args.image) {
    const abs = resolve(process.cwd(), args.image);
    const image = readFileSync(abs).toString('base64');
    const mimeType = mimeForPath(abs);
    const res = await postCapture(args.url, { image, mimeType }, args.cookie);
    reports.push({
      bar: args.image,
      status: res.status,
      outcome: res.outcome,
      lines: res.body.lines?.length ?? 0,
      items: res.body.items?.length ?? 0,
      requiresSignIn: Boolean(res.body.requiresSignIn),
    });
    return { mode: 'live', reports, failures: allFailures };
  }

  for (const bar of bars) {
    if (bar.menuStyle === 'bespoke' && (!bar.lines || bar.lines.length === 0)) {
      reports.push({ bar: bar.name, id: bar.id, menuStyle: 'bespoke', skipped: true });
      continue;
    }

    const useVision = args.vision && Boolean(bar.imageUrl);
    const payload = useVision
      ? await fetchImageBase64(bar.imageUrl)
      : { text: (bar.lines ?? []).join('\n') };

    const res = await postCapture(args.url, payload, args.cookie);
    const items = Array.isArray(res.body.items) ? res.body.items : [];
    const failures = useVision ? [] : checkAssertions(bar, items);
    allFailures.push(...failures);

    reports.push({
      bar: bar.name,
      id: bar.id,
      method: useVision ? 'photo' : 'manual',
      status: res.status,
      outcome: res.outcome,
      total: items.length,
      catalogCount: items.filter((i) => i.drinkName).length,
      directionalCount: items.filter((i) => !i.drinkName && i.directional).length,
      unplacedCount: items.filter((i) => !i.drinkName && !i.directional).length,
      naCount: items.filter((i) => i.nonAlcoholic).length,
      naAlcoholicClassicLeaks: items.filter((i) => i.nonAlcoholic && i.directional?.closestClassicName).length,
      requiresSignIn: Boolean(res.body.requiresSignIn),
      failures,
    });
  }

  return { mode: 'live', reports, failures: allFailures };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  const bars = args.bar ? fixture.bars.filter((b) => b.id === args.bar) : fixture.bars;

  if (bars.length === 0 && !args.image) {
    console.error(`No benchmark bar matched --bar "${args.bar}".`);
    process.exit(1);
  }

  const result = args.mode === 'live' ? await runLive(bars, args) : await runLocal(bars);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nCotidal Menu Capture Eval (${result.mode})\n`);
    for (const r of result.reports) {
      if (r.skipped) {
        console.log(`- ${r.bar} [${r.menuStyle}]: bespoke / no written menu (0 items)`);
        continue;
      }
      const cov = r.coverage
        ? ` | coverage: ${Object.entries(r.coverage)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`
        : '';
      const outcome = r.outcome ? ` | x-generation=${r.outcome}` : '';
      console.log(
        `- ${r.bar}: ${r.total} items (${r.catalogCount ?? 0} catalog, ${r.directionalCount ?? 0} directional, ${r.unplacedCount ?? 0} unplaced) | N/A=${r.naCount ?? 0} (leaks=${r.naAlcoholicClassicLeaks ?? 0})${cov}${outcome}`
      );
      if (r.failures?.length) {
        for (const f of r.failures) console.log(`    FAIL: ${f}`);
      }
    }
    console.log('');
  }

  if (result.failures.length > 0) {
    console.error(`${result.failures.length} assertion(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
