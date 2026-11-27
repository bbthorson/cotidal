import { drinkDatabase, type Drink } from '../drinks/data';
import { drinkOf } from '../drinks/search';

/**
 * Your taste as terrain over the map, not a point on it.
 *
 * The point model (`applyPour`) assumes two things that pours contradict: that
 * liking falls off evenly in every direction from one place, and that there is
 * one place. Someone who rates Negronis and Daiquiris 9 is pulled back and
 * forth between them and settles in the middle of the map, where neither is,
 * and their list fills with Hazy IPA (`tests/unit/terrain.test.ts`).
 *
 * Here the height of the ground at any coordinate is how much you are likely
 * to like a drink there, on the hedonic scale with 5 as sea level, inferred
 * by Gaussian-process regression:
 *
 * - **The questions lay the first hill.** It is centred where the quiz put
 *   you, and is wider on an axis the quiz was less sure of (`hillWidth`), so
 *   it need not be round. Far from it the ground is at sea level: no claim.
 * - **Every rated pour reshapes the ground where its drink sits.** A 9 raises
 *   it, a 2 digs it out, over a few points around the drink (`LENGTH`). Two
 *   liked parts of the map become two hills.
 * - **A rating is partly about the drink itself** (`DRINK_SD`). Two drinks
 *   a point apart on the map are still two drinks: a 2 for the Martinez
 *   between a 9 for the Manhattan and an 8 for the Penicillin sinks the
 *   Martinez and dents the ground around it, rather than sinking the hill.
 *   A second dislike nearby is a second drink saying the same, and is
 *   believed as the ground's.
 * - **A rating carries less to a different kind of drink** (`KIN_ACROSS`).
 *   The map puts a Rioja beside a Manhattan; a 9 for the Manhattan says less
 *   about the Rioja than about the Martinez. Cocktails and spirits are one
 *   kind; wine and beer are each their own. The drawn ground is the best of
 *   any kind (`heightAt` with no kind); a drink is ranked by its own
 *   (`drinkHeight`).
 * - **Every height has an uncertainty** (`sd`), small where you have rated
 *   drinks and back to the prior's far from any, so a screen can fade what
 *   nothing supports instead of claiming it.
 *
 * Nothing here is stored. It is recomputed from the records that already
 * hold what the member said — the questions' answers and the pours — so it
 * can change without rewriting anyone's records. The pours' order does not
 * matter, unlike a replay of `applyPour`. A pour whose drink is not on the
 * map has no coordinate and shapes nothing.
 *
 * None of the constants are calibrated against real ratings yet, like
 * `NOISE_LEVELS` in the quiz. `LENGTH` is not set below the 2.9-point error
 * of style-placed drinks (`placement.ts`): a narrower hill would claim more
 * precision than the drinks' own coordinates have.
 */

/** How far a rating's influence reaches, in map points (the kernel's length scale). */
export const LENGTH = 2.5;
/** How far the ground can rise or fall from the prior, in rating points (the smooth kernel's standard deviation). */
export const SIGNAL_SD = 2.5;
/**
 * How far one drink can stand above or below the ground around it, in rating
 * points: what a rating says about that drink alone rather than its corner of
 * the map.
 */
export const DRINK_SD = 1.5;
/** How much one rating of a drink can differ from the next of the same drink, in rating points. */
export const RATING_NOISE_SD = 1;
/**
 * How much a rating says about a drink of another kind than the one rated,
 * as a share of what it says about the same kind (a correlation, 0 to 1).
 */
export const KIN_ACROSS = 0.4;
/** How high the questions' hill stands at its centre, in rating points above sea level (5). */
export const PRIOR_PEAK = 2;
/** How broad a taste the questions' hill assumes before any pour, in map points. */
export const PRIOR_BREADTH = 4;
/** The quiz's variance when there was no quiz: the filter's starting uncertainty on the map axes. */
export const UNKNOWN_VARIANCE = 25;
/** Sea level: a 5 on the 9-point hedonic scale, neither liked nor disliked. */
export const SEA_LEVEL = 5;

/** Where the questions put you, and how sure they were on each axis. */
export interface TerrainStart {
  x: number;
  y: number;
  variance?: { x: number; y: number };
}

/** A pour as far as the terrain needs it: what was drunk, and how it was rated. */
export interface TerrainPour {
  drink: { name: string; slug?: string };
  rating: { hedonic: number };
}

/** Which kind a drink is, for how far a rating of it carries: cocktails and spirits are one. */
export type Kind = 'spirits' | 'wine' | 'beer';
export const kindOf = (d: Pick<Drink, 'type'>): Kind => (d.type === 'Wine' ? 'wine' : d.type === 'Beer' ? 'beer' : 'spirits');
const KINDS: readonly Kind[] = ['spirits', 'wine', 'beer'];

/** A rated pour placed on the map. */
interface Observation {
  drink: Drink;
  hedonic: number;
}

export interface Terrain {
  start: TerrainStart;
  /** The rated pours that shape it, placed. */
  observations: readonly Observation[];
  /** (K + σ²I)⁻¹ (y − m), solved once. */
  alpha: Float64Array;
  /** The Cholesky factor of K + σ²I, kept for the uncertainty. */
  chol: Float64Array;
}

export interface Height {
  /** Expected rating, on the 9-point scale. */
  rating: number;
  /** How unsure that is, in rating points (one standard deviation). */
  sd: number;
}

/**
 * The questions' hill is a Gaussian of breadth `PRIOR_BREADTH`, widened on
 * each axis by how unsure the quiz was of your position there: an uncertain
 * centre spreads the hill along that axis.
 */
export function hillWidth(start: TerrainStart): { x: number; y: number } {
  const vx = start.variance?.x ?? UNKNOWN_VARIANCE;
  const vy = start.variance?.y ?? UNKNOWN_VARIANCE;
  return { x: Math.sqrt(PRIOR_BREADTH ** 2 + vx), y: Math.sqrt(PRIOR_BREADTH ** 2 + vy) };
}

/** The ground before any pour, above sea level, at a point. */
function priorAt(start: TerrainStart, x: number, y: number): number {
  const w = hillWidth(start);
  const dx = (x - start.x) / w.x;
  const dy = (y - start.y) / w.y;
  return PRIOR_PEAK * Math.exp(-0.5 * (dx * dx + dy * dy));
}

/** How much the ground at one place and kind says about another: near and alike, much; far or unlike, little. */
function ground(ax: number, ay: number, ak: Kind, bx: number, by: number, bk: Kind): number {
  const d2 = (ax - bx) ** 2 + (ay - by) ** 2;
  return SIGNAL_SD ** 2 * Math.exp(-d2 / (2 * LENGTH ** 2)) * (ak === bk ? 1 : KIN_ACROSS);
}

/** Two ratings' covariance: the ground they share, and the drink itself when it is the same drink. */
function between(a: Drink, b: Drink): number {
  return ground(a.x, a.y, kindOf(a), b.x, b.y, kindOf(b)) + (a.name === b.name ? DRINK_SD ** 2 : 0);
}

/** Lower-triangular Cholesky factor of a symmetric positive-definite n×n matrix (row-major). */
function cholesky(a: Float64Array, n: number): Float64Array {
  const l = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i * n + j];
      for (let k = 0; k < j; k++) sum -= l[i * n + k] * l[j * n + k];
      l[i * n + j] = i === j ? Math.sqrt(sum) : sum / l[j * n + j];
    }
  }
  return l;
}

/** Solves L z = b (forward). */
function forward(l: Float64Array, n: number, b: Float64Array): Float64Array {
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= l[i * n + k] * z[k];
    z[i] = sum / l[i * n + i];
  }
  return z;
}

/** Solves Lᵀ x = z (backward). */
function backward(l: Float64Array, n: number, z: Float64Array): Float64Array {
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = z[i];
    for (let k = i + 1; k < n; k++) sum -= l[k * n + i] * x[k];
    x[i] = sum / l[i * n + i];
  }
  return x;
}

/** The terrain from where the questions put you and every rated pour since. */
export function buildTerrain(
  start: TerrainStart,
  pours: readonly TerrainPour[],
  drinks: readonly Drink[] = drinkDatabase
): Terrain {
  const observations: Observation[] = [];
  for (const p of pours) {
    const drink = drinkOf(p.drink, drinks);
    if (drink) observations.push({ drink, hedonic: p.rating.hedonic });
  }
  const n = observations.length;
  const k = new Float64Array(n * n);
  const resid = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = observations[i].drink;
    resid[i] = observations[i].hedonic - SEA_LEVEL - priorAt(start, a.x, a.y);
    for (let j = 0; j < n; j++) k[i * n + j] = between(a, observations[j].drink) + (i === j ? RATING_NOISE_SD ** 2 : 0);
  }
  const chol = cholesky(k, n);
  const alpha = backward(chol, n, forward(chol, n, resid));
  return { start, observations, alpha, chol };
}

/** The posterior at a query whose covariance with each rating is `cov` and whose own prior variance is `prior`. */
function posterior(t: Terrain, x: number, y: number, cov: (o: Observation) => number, prior: number): Height {
  const n = t.observations.length;
  const kx = new Float64Array(n);
  let mean = priorAt(t.start, x, y);
  for (let i = 0; i < n; i++) {
    kx[i] = cov(t.observations[i]);
    mean += kx[i] * t.alpha[i];
  }
  const v = forward(t.chol, n, kx);
  let explained = 0;
  for (let i = 0; i < n; i++) explained += v[i] * v[i];
  return { rating: SEA_LEVEL + mean, sd: Math.sqrt(Math.max(0, prior - explained)) };
}

/**
 * The ground at a coordinate for a drink of one kind: what you are likely to
 * think of a drink there you have not had. With no kind, the best of any
 * kind: the ground as the map draws it.
 */
export function heightAt(t: Terrain, x: number, y: number, kind?: Kind): Height {
  if (!kind) {
    let best: Height | null = null;
    for (const k of KINDS) {
      const h = heightAt(t, x, y, k);
      if (!best || h.rating > best.rating) best = h;
    }
    return best!;
  }
  return posterior(t, x, y, (o) => ground(x, y, kind, o.drink.x, o.drink.y, kindOf(o.drink)), SIGNAL_SD ** 2);
}

/** One drink's height: the ground under it, and what you have said of that drink itself. */
export function drinkHeight(t: Terrain, drink: Drink): Height {
  return posterior(t, drink.x, drink.y, (o) => between(drink, o.drink), SIGNAL_SD ** 2 + DRINK_SD ** 2);
}

/** A pour that supports a drink's height: one near it, and how near. */
export interface Evidence {
  drink: Drink;
  hedonic: number;
  distance: number;
}

export interface Ranked extends Height {
  drink: Drink;
  /**
   * The rated pours nearest the drink that shape its ground, strongest pull
   * first ("near your Negroni, 9"). Empty where only the questions speak.
   */
  evidence: Evidence[];
}

/** How far a pour can be from a drink and still be named as a reason for it, in map points. */
export const EVIDENCE_REACH = 2 * LENGTH;

/**
 * The rated pours that bear on a coordinate, most pull first: nearer, further
 * from a 5, and of the same kind. Each drink once, at its latest rating.
 */
export function evidenceAt(t: Terrain, x: number, y: number, kind?: Kind, limit = 2): Evidence[] {
  const latest = new Map<string, Observation>();
  for (const o of t.observations) latest.set(o.drink.name, o);
  const pull = (o: Observation, distance: number) =>
    Math.abs(o.hedonic - SEA_LEVEL) * Math.exp(-(distance ** 2) / (2 * LENGTH ** 2)) * (!kind || kindOf(o.drink) === kind ? 1 : KIN_ACROSS);
  return [...latest.values()]
    .map((o) => ({ o, distance: Math.hypot(o.drink.x - x, o.drink.y - y) }))
    .filter((e) => e.distance <= EVIDENCE_REACH)
    .sort((a, b) => pull(b.o, b.distance) - pull(a.o, a.distance))
    .slice(0, limit)
    .map(({ o, distance }) => ({ drink: o.drink, hedonic: o.hedonic, distance: Math.round(distance * 10) / 10 }));
}

/** Every drink by its height, highest first. */
export function rankByTerrain(t: Terrain, drinks: readonly Drink[] = drinkDatabase): Ranked[] {
  return drinks
    .map((drink) => ({ drink, ...drinkHeight(t, drink), evidence: evidenceAt(t, drink.x, drink.y, kindOf(drink)) }))
    .sort((a, b) => b.rating - a.rating || a.drink.name.localeCompare(b.drink.name));
}

/** The ground sampled on a grid across the map, for drawing its contours: `rows[j][i]` is at x = −10 + i·step, y = −10 + j·step. */
export function sampleTerrain(t: Terrain, step = 0.5): { step: number; rows: Height[][] } {
  const count = Math.round(20 / step) + 1;
  const rows: Height[][] = [];
  for (let j = 0; j < count; j++) {
    const row: Height[] = [];
    for (let i = 0; i < count; i++) row.push(heightAt(t, -10 + i * step, -10 + j * step));
    rows.push(row);
  }
  return { step, rows };
}

/** A hilltop: a place on the map where the ground is higher than all around it. */
export interface Peak {
  x: number;
  y: number;
  rating: number;
}

/** The lowest a hilltop may stand and still count as one: a 6, liked a little. */
export const PEAK_MIN = 6;

/**
 * The hilltops, highest first: local maxima of the sampled ground that stand
 * at `PEAK_MIN` or above. Someone who likes two parts of the map has two.
 */
export function peaks(t: Terrain, step = 0.5): Peak[] {
  const { rows } = sampleTerrain(t, step);
  const found: Peak[] = [];
  const count = rows.length;
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const h = rows[j][i].rating;
      if (h < PEAK_MIN) continue;
      let top = true;
      for (let dj = -1; dj <= 1 && top; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const r = rows[j + dj]?.[i + di];
          if (r && r.rating > h) {
            top = false;
            break;
          }
        }
      }
      if (top) found.push({ x: -10 + i * step, y: -10 + j * step, rating: h });
    }
  }
  return found.sort((a, b) => b.rating - a.rating);
}

/** Which way a hill leans on each axis; null where it sits in the middle of that axis. */
export interface Leaning {
  x: 'rich' | 'crisp' | null;
  y: 'sweet' | 'savory' | null;
  /** The hilltop's height, for ordering. */
  rating: number;
}

/** How far from the middle of an axis a hilltop must sit to lean that way, in map points. */
export const LEAN_FROM = 1.5;

/**
 * Your taste in the axes' own words, one entry per hill, highest first:
 * rich or crisp, sweet or savory, or neither where a hill sits in the middle.
 * Two hills that lean the same way are one entry. Not a region: someone with
 * a hill in the Deep and one in the Surf leans rich and savory, and crisp and
 * sweet.
 */
export function leanings(t: Terrain, limit = 3): Leaning[] {
  const seen = new Set<string>();
  const out: Leaning[] = [];
  for (const p of peaks(t)) {
    const lean: Leaning = {
      x: p.x >= LEAN_FROM ? 'crisp' : p.x <= -LEAN_FROM ? 'rich' : null,
      y: p.y >= LEAN_FROM ? 'sweet' : p.y <= -LEAN_FROM ? 'savory' : null,
      rating: p.rating,
    };
    const key = `${lean.x}/${lean.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lean);
    if (out.length === limit) break;
  }
  return out;
}
