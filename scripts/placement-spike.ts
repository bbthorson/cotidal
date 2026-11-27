/**
 * Spike (November 2026), kept as a record: it did not beat today's placement,
 * so nothing ships from it (docs/drink-sources.md, Placing a cocktail).
 *
 *   npx tsx scripts/placement-spike.ts           # held-out RMS per feature set
 *   npx tsx scripts/placement-spike.ts worst     # the largest misses
 *   npx tsx scripts/placement-spike.ts axes      # per axis, and nearest neighbours
 *   npx tsx scripts/placement-spike.ts feats     # each drink's computed makeup
 *
 * Place a cocktail from its makeup, as placeStyle does for wine.
 * Per drink, from its amounts: sugar, acid, alcohol, dilution, bitterness,
 * savouriness (and a few more), from a small table of what each ingredient
 * contains. Fit x and y by ridge least squares to the hand-placed cocktails
 * that have entries with amounts, and score each drink held out of the fit.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drinkDatabase } from '../src/lib/drinks/data';
import { placeDirectional } from '../src/lib/drinks/ingredient-match';

const dir = join(process.cwd(), 'src/content/drinks');

// What an ingredient contains, per ml (sugar and acid in g/ml; the rest are
// unit scores per ml). Typical figures for the category, not a bottle.
interface Makeup { abv?: number; sugar?: number; acid?: number; bitter?: number; savory?: number; fat?: number; dark?: number; fizz?: number; egg?: number; herb?: number; smoke?: number }
type Row = [RegExp, Makeup, number?]; // optional default ml when the amount is a count or missing

const T: Row[] = [
  // garnish and aromatics: no volume worth counting
  [/garnish array|cucumber wheel/i, {}, 0],
  [/onion/i, { savory: 1 }, 5],
  [/mint|spearmint|basil/i, { herb: 1 }, 3],
  [/celery salt|pepper|sea salt|salt/i, { savory: 3 }, 1],
  [/hot sauce|tabasco|worcester/i, { savory: 3, acid: 0.02 }, 1],
  [/olive brine/i, { savory: 2, acid: 0.01 }],
  [/tomato/i, { sugar: 0.03, acid: 0.004, savory: 1 }],
  // bitters and anise
  [/peychaud|angostura|orange bitters|\bbitters\b/i, { abv: 0.4, bitter: 0.6, sugar: 0.05 }],
  [/absinthe|pernod|pastis|herbsaint/i, { abv: 0.6 }],
  // amari and bitter aperitifs
  [/fernet/i, { abv: 0.39, sugar: 0.03, bitter: 2 }],
  [/campari|select aperitivo/i, { abv: 0.25, sugar: 0.24, bitter: 1.2 }],
  [/aperol/i, { abv: 0.11, sugar: 0.22, bitter: 0.5 }],
  [/nonino|amaro|montenegro|averna|cynar/i, { abv: 0.33, sugar: 0.15, bitter: 0.8 }],
  [/suze|gentian/i, { abv: 0.2, sugar: 0.15, bitter: 1.2 }],
  // aromatised and fortified wines
  [/kina|cocchi americano|lillet/i, { abv: 0.17, sugar: 0.1, acid: 0.005, bitter: 0.2 }],
  [/sweet vermouth|rosso|punt e mes|carpano/i, { abv: 0.16, sugar: 0.15, acid: 0.005, bitter: 0.25, dark: 0.5 }],
  [/dry (french )?vermouth|french dry vermouth|dolin|noilly/i, { abv: 0.17, sugar: 0.03, acid: 0.006 }],
  [/sherry|fino|manzanilla|amontillado/i, { abv: 0.15, sugar: 0.003, acid: 0.005, savory: 1 }],
  [/pimm/i, { abv: 0.25, sugar: 0.15, bitter: 0.3, dark: 0.3 }],
  // wines
  [/champagne|prosecco|sparkling wine|cava/i, { abv: 0.12, sugar: 0.01, acid: 0.007, fizz: 1 }],
  [/red wine/i, { abv: 0.13, sugar: 0.002, acid: 0.006, bitter: 0.3, dark: 0.4 }],
  [/white wine|pinot grigio/i, { abv: 0.12, sugar: 0.003, acid: 0.007 }],
  // liqueurs
  [/chartreuse/i, { abv: 0.55, sugar: 0.25, herb: 1 }],
  [/b[ée]n[ée]dictine/i, { abv: 0.4, sugar: 0.33, herb: 0.5, dark: 0.3 }],
  [/drambuie/i, { abv: 0.4, sugar: 0.3, dark: 0.5 }],
  [/grand marnier/i, { abv: 0.4, sugar: 0.2, dark: 0.4 }],
  [/cointreau|triple sec|cura[çc]ao|orange liqueur/i, { abv: 0.4, sugar: 0.25 }],
  [/maraschino/i, { abv: 0.32, sugar: 0.3 }],
  [/cherry liqueur|sangue morlacco|cherry heering/i, { abv: 0.25, sugar: 0.3, dark: 0.3 }],
  [/st-germain|elderflower/i, { abv: 0.2, sugar: 0.18 }],
  [/cassis|m[ûu]re|chambord|raspberry liqueur|blackberry liqueur/i, { abv: 0.16, sugar: 0.45, acid: 0.005 }],
  [/violette/i, { abv: 0.16, sugar: 0.3 }],
  [/cr[èe]me de cacao/i, { abv: 0.25, sugar: 0.35, dark: 0.5 }],
  [/cr[èe]me de menthe/i, { abv: 0.25, sugar: 0.35, herb: 1 }],
  [/coffee liqueur|kahl[úu]a/i, { abv: 0.2, sugar: 0.4, bitter: 0.2, dark: 1 }],
  [/amaretto/i, { abv: 0.28, sugar: 0.3, dark: 0.5 }],
  [/irish cream|baileys/i, { abv: 0.17, sugar: 0.2, fat: 0.14, dark: 0.5 }],
  [/peach schnapps/i, { abv: 0.2, sugar: 0.25 }],
  [/passion fruit liqueur/i, { abv: 0.2, sugar: 0.25, acid: 0.005 }],
  [/falernum/i, { abv: 0.11, sugar: 0.4, acid: 0.005 }],
  // syrups and sugar
  [/donn/i, { sugar: 0.27, acid: 0.016 }],
  [/orgeat/i, { sugar: 0.8, fat: 0.03, dark: 0.2 }],
  [/grenadine/i, { sugar: 0.8, acid: 0.01 }],
  [/raspberry syrup/i, { sugar: 0.8, acid: 0.01 }],
  [/lime cordial/i, { sugar: 0.5, acid: 0.03 }],
  [/honey/i, { sugar: 0.85, dark: 0.2 }],
  [/agave nectar|agave syrup/i, { sugar: 0.9 }],
  [/rich simple|2:1/i, { sugar: 1.0 }],
  [/demerara (simple )?syrup|cane sugar syrup/i, { sugar: 0.8, dark: 0.2 }],
  [/simple syrup|sugar cube|sugar|powdered sugar/i, { sugar: 0.8 }, 0], // solid sugar handled by amount parsing
  // juices and fruit
  [/passion fruit pur/i, { sugar: 0.1, acid: 0.04 }],
  [/peach pur/i, { sugar: 0.12, acid: 0.005 }],
  [/lime/i, { sugar: 0.015, acid: 0.06 }, 15],
  [/lemon/i, { sugar: 0.025, acid: 0.055 }, 15],
  [/grapefruit soda|toronja|squirt/i, { sugar: 0.11, acid: 0.004, fizz: 1 }],
  [/grapefruit/i, { sugar: 0.08, acid: 0.022, bitter: 0.1 }],
  [/orange juice|fresh orange/i, { sugar: 0.09, acid: 0.009 }],
  [/orange, sliced/i, { sugar: 0.09, acid: 0.009 }, 30],
  [/pineapple/i, { sugar: 0.1, acid: 0.008 }],
  [/cranberry/i, { sugar: 0.12, acid: 0.007 }],
  [/grapes/i, { sugar: 0.16, acid: 0.006 }, 4],
  // dairy, egg, coffee
  [/coconut cream/i, { sugar: 0.2, fat: 0.2 }],
  [/heavy cream|cream\b/i, { fat: 0.36 }],
  [/egg white/i, { egg: 1 }, 30],
  [/espresso/i, { bitter: 0.6, dark: 1 }],
  [/coffee/i, { bitter: 0.3, dark: 1 }],
  // mixers
  [/tonic/i, { sugar: 0.085, acid: 0.003, bitter: 0.4, fizz: 1 }],
  [/ginger beer/i, { sugar: 0.1, acid: 0.003, fizz: 1, herb: 0.3 }],
  [/ginger ale|lemonade/i, { sugar: 0.09, acid: 0.003, fizz: 1 }],
  [/cola/i, { sugar: 0.106, acid: 0.002, fizz: 1, dark: 0.3 }],
  [/club soda|soda water|sparkling (mineral )?water|seltz/i, { fizz: 1 }],
  [/^water$/i, {}],
  // spirits (last: names like "orange cognac liqueur" are caught above)
  [/islay|peated/i, { abv: 0.46, dark: 1, smoke: 1 }],
  [/mezcal/i, { abv: 0.45, smoke: 0.6 }],
  [/scotch/i, { abv: 0.4, dark: 1, smoke: 0.2 }],
  [/bourbon|rye|whisk/i, { abv: 0.45, dark: 1 }],
  [/cask-strength/i, { abv: 0.6, dark: 1 }],
  [/cognac|brandy|armagnac|applejack|calvados/i, { abv: 0.4, dark: 0.9 }],
  [/pisco/i, { abv: 0.42 }],
  [/reposado|a[ñn]ejo/i, { abv: 0.4, dark: 0.5 }],
  [/tequila/i, { abv: 0.4 }],
  [/blackstrap|dark jamaican|jamaican dark|demerara rum|goslings|aged rum|gold .*rum/i, { abv: 0.43, dark: 0.9 }],
  [/cacha[çc]a/i, { abv: 0.4 }],
  [/\brum\b/i, { abv: 0.4, dark: 0.1 }],
  [/vodka/i, { abv: 0.4 }],
  [/gin\b/i, { abv: 0.42, herb: 0.3 }],
];

function lookup(name: string): Row | null {
  for (const r of T) if (r[0].test(name)) return r;
  return null;
}

const OZ = 30;
function frac(s: string): number {
  // "1 1/2", "3/4", "2.5", "3-4" (take mean)
  const range = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  let total = 0;
  for (const part of s.trim().split(/\s+/)) {
    if (part.includes('/')) { const [a, b] = part.split('/').map(Number); total += a / b; }
    else total += Number(part);
  }
  return total;
}

/** ml of liquid, or grams of solid sugar (returned as { sugarG }). */
function amountOf(amount: string | undefined, name: string, row: Row | null): { ml: number; sugarG?: number } {
  const a = (amount ?? '').trim().toLowerCase();
  const solidSugar = /sugar/i.test(name) && !/syrup/i.test(name);
  const num = a.match(/^([\d./\s-]+)/)?.[1]?.trim();
  const n = num ? frac(num) : NaN;
  const unit = a.replace(/^([\d./\s-]+)/, '').trim();
  if (solidSugar) {
    if (/cube/.test(name.toLowerCase()) || unit === '') return { ml: 0, sugarG: (Number.isFinite(n) ? n : 1) * 4 };
    if (/tbsp/.test(unit)) return { ml: 0, sugarG: n * 12 };
    if (/tsp/.test(unit)) return { ml: 0, sugarG: n * 4 };
    if (/bar ?spoon/.test(unit)) return { ml: 0, sugarG: n * 4 };
    if (/oz/.test(unit)) return { ml: n * OZ }; // "1/4 oz simple syrup" alternatives
  }
  if (/oz/.test(unit)) return { ml: n * OZ };
  if (/ml/.test(unit)) return { ml: n };
  if (/dash/.test(unit) || (a === 'dash')) return { ml: (Number.isFinite(n) ? n : 1) * 0.8 };
  if (/drop/.test(unit) || /drop/.test(a) || /drops/.test(name)) return { ml: (Number.isFinite(n) ? n : 4) * 0.05 };
  if (/rinse/.test(a)) return { ml: 2 };
  if (/tbsp/.test(unit)) return { ml: n * 15 };
  if (/tsp/.test(unit)) return { ml: n * 5 };
  if (/bar ?spoon/.test(unit)) return { ml: n * 5 };
  if (/pinch/.test(a)) return { ml: 1 };
  if (/wedge/.test(unit)) return { ml: 7 };
  if (/splash/.test(name)) return { ml: 20 };
  const def = row?.[2];
  if (Number.isFinite(n) && def !== undefined) return { ml: n * def };
  if (def !== undefined) return { ml: def };
  if (/to top|top/.test(name.toLowerCase()) || a === '') return { ml: 90 }; // a top-up
  return { ml: Number.isFinite(n) ? n * OZ : 0 };
}

interface Drink { name: string; x: number; y: number; feats: Record<string, number>; unmatched: string[]; ingredients: string }

const drinks: Drink[] = [];
for (const f of readdirSync(dir)) {
  const raw = readFileSync(`${dir}/${f}`, 'utf8');
  const name = raw.match(/^name:\s*"(.+)"$/m)?.[1];
  const d = drinkDatabase.find((x) => x.name === name);
  if (!d || d.type !== 'Cocktail') continue;
  const method = (raw.match(/^ {2}method:\s*"(.+)"$/m)?.[1] ?? '').toLowerCase();
  const glass = (raw.match(/^ {2}glass:\s*"(.+)"$/m)?.[1] ?? '').toLowerCase();
  const up = /strain/.test(method) && !/rocks|highball|over ice|filled with ice|collins|tumbler|crushed/.test(glass + ' ' + method) ? 1 : 0;
  const lines = [...raw.matchAll(/^ {2}- \{(.*)\}$/gm)].map((m) => m[1]).filter((l) => /name:/.test(l) && !/title:/.test(l));
  if (lines.length === 0) continue;
  const tot: Required<Makeup> = { abv: 0, sugar: 0, acid: 0, bitter: 0, savory: 0, fat: 0, dark: 0, fizz: 0, egg: 0, herb: 0, smoke: 0 };
  let vol = 0, topped = 0; const unmatched: string[] = []; const names: string[] = [];
  for (const l of lines) {
    const iname = l.match(/name:\s*"([^"]+)"/)?.[1] ?? '';
    const amount = l.match(/amount:\s*"([^"]+)"/)?.[1];
    if (/optional: true/.test(l)) continue;
    if (/served on the side/i.test(iname)) continue;
    names.push(iname);
    const row = lookup(iname);
    if (!row) { unmatched.push(iname); continue; }
    const { ml, sugarG } = amountOf(amount, iname, row);
    const m = row[1];
    if (sugarG) tot.sugar += sugarG;
    const liquid = /mint|spearmint|basil|salt|pepper|onion|grapes|garnish|cucumber/i.test(iname) ? 0 : ml;
    vol += liquid;
    if (m.fizz) topped += ml;
    for (const k of Object.keys(tot) as (keyof Makeup)[]) tot[k] += (m[k] ?? 0) * ml;
  }
  // Dilution from the method, on the volume before any top-up.
  const pre = vol - topped;
  const dil = /blend/.test(method) ? 0.6 : /shak/.test(method) ? 0.3 : /stir/.test(method) && !/built|over ice|top/.test(method) ? 0.22 : /ice|built|swizzl|crushed/.test(method) ? 0.15 : 0.05;
  const V = vol + pre * dil;
  const per100 = (v: number) => (100 * v) / V;
  const feats = {
    abv: tot.abv / V,                       // alcohol by volume, after dilution
    sugar: per100(tot.sugar),               // g/100 ml
    acid: per100(tot.acid),                 // g/100 ml, citric-equivalent
    bitter: per100(tot.bitter),
    savory: per100(tot.savory),
    fat: per100(tot.fat),
    dark: tot.dark / V,                     // share of the glass that is aged spirit, coffee, cacao…
    fizz: tot.fizz / V,                     // share that is sparkling
    egg: tot.egg > 0 ? 1 : 0,
    herb: per100(tot.herb),
    smoke: per100(tot.smoke),
    logV: Math.log(V),
    dilution: dil,
    logSugar: Math.log2(1 + per100(tot.sugar)),
    balance: Math.log2((per100(tot.sugar) + 1) / (10 * per100(tot.acid) + 1)),
    logBitter: Math.log2(1 + per100(tot.bitter)),
    logSavory: Math.log2(1 + per100(tot.savory)),
    up,
  };
  drinks.push({ name: d.name, x: d.x, y: d.y, feats, unmatched, ingredients: names.join(', ') });
}

// Ridge least squares, features standardised on the training set.
function fit(X: number[][], y: number[], lambda: number) {
  const n = X.length, p = X[0].length;
  const mu = Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const sd = Array.from({ length: p }, (_, j) => Math.sqrt(X.reduce((s, r) => s + (r[j] - mu[j]) ** 2, 0) / n) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const ym = y.reduce((a, b) => a + b, 0) / n;
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => Z.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? lambda : 0)));
  const b = Array.from({ length: p }, (_, i) => Z.reduce((s, r, k) => s + r[i] * (y[k] - ym), 0));
  // Gaussian elimination
  for (let i = 0; i < p; i++) {
    let piv = i; for (let k = i + 1; k < p; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
    [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
    for (let k = i + 1; k < p; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < p; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; }
  }
  const w = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < p; j++) s -= A[i][j] * w[j]; w[i] = s / A[i][i]; }
  return (r: number[]) => ym + r.reduce((s, v, j) => s + w[j] * (v - mu[j]) / sd[j], 0);
}

const clamp = (v: number) => Math.max(-10, Math.min(10, v));
function loo(keysX: string[], keysY: string[], lambda: number) {
  const errs: number[] = []; const rows: { name: string; e: number; px: number; py: number; x: number; y: number }[] = [];
  for (let i = 0; i < drinks.length; i++) {
    const train = drinks.filter((_, k) => k !== i);
    const fx = fit(train.map((d) => keysX.map((k) => d.feats[k])), train.map((d) => d.x), lambda);
    const fy = fit(train.map((d) => keysY.map((k) => d.feats[k])), train.map((d) => d.y), lambda);
    const d = drinks[i];
    const px = clamp(fx(keysX.map((k) => d.feats[k]))), py = clamp(fy(keysY.map((k) => d.feats[k])));
    const e = Math.hypot(px - d.x, py - d.y); errs.push(e); rows.push({ name: d.name, e, px, py, x: d.x, y: d.y });
  }
  const rms = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length);
  return { rms, rows };
}

const unmatchedAll = drinks.flatMap((d) => d.unmatched.map((u) => `${d.name}: ${u}`));
console.log('drinks', drinks.length, 'unmatched ingredients', unmatchedAll.length);
for (const u of unmatchedAll) console.log('  ?', u);

// Baselines on the same drinks.
const mean = { x: drinks.reduce((s, d) => s + d.x, 0) / drinks.length, y: drinks.reduce((s, d) => s + d.y, 0) / drinks.length };
const meanRms = Math.sqrt(drinks.reduce((s, d) => s + (d.x - mean.x) ** 2 + (d.y - mean.y) ** 2, 0) / drinks.length);
console.log('baseline: everything at the mean', meanRms.toFixed(2));
const dir2 = drinks.map((d) => { const p = placeDirectional(d.ingredients); return p ? Math.hypot(p.x - d.x, p.y - d.y) : null; }).filter((e): e is number => e !== null);
console.log('placeDirectional, in sample (its pulls were fit to these):', Math.sqrt(dir2.reduce((s, e) => s + e * e, 0) / dir2.length).toFixed(2), `on ${dir2.length}`);

// Pre-declared feature sets, scored held out.
const ALL = ['abv', 'sugar', 'acid', 'bitter', 'savory', 'fat', 'dark', 'fizz', 'egg', 'herb', 'smoke', 'logV', 'dilution'];
const CORE = ['abv', 'sugar', 'acid', 'bitter', 'savory'];
const CORE_PLUS = ['abv', 'sugar', 'acid', 'bitter', 'savory', 'fat', 'dark', 'fizz'];
const mode = process.argv[2] ?? 'report';
const BAL = ['abv', 'logSugar', 'balance', 'logBitter', 'logSavory', 'fat', 'dark', 'fizz'];
const BAL_PLUS = [...BAL, 'up', 'egg', 'herb', 'smoke', 'logV'];
for (const [label, ks] of [['core (sugar, acid, alcohol, bitter, savory)', CORE], ['core + fat, dark, fizz', CORE_PLUS], ['all thirteen', ALL], ['balance (log sugar, sugar:acid, log bitter, log savory) + abv, fat, dark, fizz', BAL], ['balance + up, egg, herb, smoke, volume', BAL_PLUS]] as const) {
  for (const lambda of [0, 1, 5, 20]) {
    const { rms } = loo([...ks], [...ks], lambda);
    console.log(`LOO ${label}, ridge ${lambda}: ${rms.toFixed(2)}`);
  }
}
if (mode === 'worst') {
  const { rows } = loo(BAL_PLUS, BAL_PLUS, 5);
  for (const r of rows.sort((a, b) => b.e - a.e).slice(0, 15)) console.log(`${r.name.padEnd(28)} ${r.e.toFixed(1)}  placed (${r.x},${r.y})  predicted (${r.px.toFixed(1)},${r.py.toFixed(1)})`);
}
if (mode === 'feats') for (const d of drinks) console.log(d.name.padEnd(28), Object.entries(d.feats).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' '));

if (mode === 'axes') {
  const { rows } = loo(BAL_PLUS, BAL_PLUS, 5);
  const rx = Math.sqrt(rows.reduce((s, r) => s + (r.px - r.x) ** 2, 0) / rows.length);
  const ry = Math.sqrt(rows.reduce((s, r) => s + (r.py - r.y) ** 2, 0) / rows.length);
  console.log(`per axis, balance+: x ${rx.toFixed(2)}, y ${ry.toFixed(2)}`);
  const sx = Math.sqrt(drinks.reduce((s, d) => s + (d.x - mean.x) ** 2, 0) / drinks.length), sy = Math.sqrt(drinks.reduce((s, d) => s + (d.y - mean.y) ** 2, 0) / drinks.length);
  console.log(`spread of the hand placements: x ${sx.toFixed(2)}, y ${sy.toFixed(2)}`);
  // k nearest neighbours in standardised feature space, held out.
  for (const k of [3, 5, 8]) {
    const errs: number[] = [];
    const F = drinks.map((d) => BAL_PLUS.map((f) => d.feats[f]));
    const mu = BAL_PLUS.map((_, j) => F.reduce((s, r) => s + r[j], 0) / F.length);
    const sd = BAL_PLUS.map((_, j) => Math.sqrt(F.reduce((s, r) => s + (r[j] - mu[j]) ** 2, 0) / F.length) || 1);
    const Z = F.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
    for (let i = 0; i < drinks.length; i++) {
      const near = drinks.map((d, j) => ({ d, dist: j === i ? Infinity : Math.hypot(...Z[i].map((v, t) => v - Z[j][t])) })).sort((a, b) => a.dist - b.dist).slice(0, k);
      const px = near.reduce((s, n) => s + n.d.x, 0) / k, py = near.reduce((s, n) => s + n.d.y, 0) / k;
      errs.push(Math.hypot(px - drinks[i].x, py - drinks[i].y));
    }
    console.log(`kNN k=${k}, held out: ${Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length).toFixed(2)}`);
  }
}
