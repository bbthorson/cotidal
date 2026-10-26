import { drinkDatabase, type Drink } from '../data';
import { calculateDistance } from '../scoring';
import { quadrantFor } from '../quadrant';
import { formatCoordinate } from '../coordinate';
import { compareMaps, nearestDrinks, type MapPoint } from '../overlap';
import { mcp } from '../copy';
import { publicMapPath } from '../atproto/paths';
import type { PublicPalateResult } from '../atproto/public-read';
import type { Register } from '../register';
import { cleanDraft, draftPath, type PourDraft } from '../pour-draft';

/**
 * What the `/mcp` tools answer, as plain functions.
 *
 * Read-only, and computed rather than generated: every answer here comes from
 * the same functions `/p/<handle>` draws from (`overlap.ts`, `quadrant.ts`),
 * so a chat assistant and the page give the same answer twice
 * (docs/generation.md). The assistant on the other end is the only model
 * involved, and it only ever reads results.
 *
 * Nothing here touches the network itself: the palate reader and the
 * register are passed in, so tests run with a fake reader and no
 * content collection.
 */

export type ReadPalate = (actor: string) => Promise<PublicPalateResult>;

export interface ToolContext {
  readPalate: ReadPalate;
  register: Register;
  /** The origin links are written against, e.g. `https://cotidal.app`. */
  origin: string;
}

export type ToolResult<T> = { ok: true; data: T } | { ok: false; message: string };

type Aversions = MapPoint['aversions'];

export interface DrinkSummary {
  name: string;
  type: Drink['type'];
  x: number;
  y: number;
  region: string;
  /** The drink's entry in the register, when it has one. */
  url: string | null;
}

export interface PalateSummary {
  handle: string | null;
  did: string;
  x: number;
  y: number;
  coordinate: string;
  region: { id: string; name: string; axis: string; gloss: string; url: string };
  avoids: string[];
  /** Pours that have moved the coordinate; `null` when the record does not say. */
  pours: number | null;
  updatedAt: string | null;
  url: string;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function avoidedFlavours(aversions: Aversions): string[] {
  return (Object.keys(mcp.flavours) as (keyof Aversions)[])
    .filter((k) => aversions[k])
    .map((k) => mcp.flavours[k]);
}

/** The flavours in `drink` that someone with `aversions` avoids. */
function clashes(drink: Drink, aversions: Aversions): string[] {
  const out: string[] = [];
  if (aversions.smoke && drink.hasSmoke) out.push(mcp.flavours.smoke);
  if (aversions.bitter && drink.isBitter) out.push(mcp.flavours.bitter);
  if (aversions.anise && drink.hasAnise) out.push(mcp.flavours.anise);
  return out;
}

function summarize(drink: Drink, ctx: ToolContext): DrinkSummary {
  const entry = ctx.register[drink.name];
  return {
    name: drink.name,
    type: drink.type,
    x: drink.x,
    y: drink.y,
    region: quadrantFor(drink.x, drink.y).name,
    url: entry ? new URL(`/drinks/${entry.slug}`, ctx.origin).toString() : null,
  };
}

/** Lower case, no accents or punctuation, `&` as "and". */
function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "Daiquiri (Classic)" → "daiquiri". No two drinks share one (tests/mcp-tools.spec.ts). */
function baseName(name: string): string {
  return normalize(name.replace(/\([^)]*\)/g, ' '));
}

/**
 * The drink a name means: its full name, or its name without the
 * parenthetical. Nothing looser, because a menu item matched to the wrong
 * drink would be ranked with confidence it has not earned.
 */
export function matchDrink(input: string, drinks: Drink[] = drinkDatabase): Drink | null {
  const wanted = normalize(input);
  if (!wanted) return null;
  return (
    drinks.find((d) => normalize(d.name) === wanted) ??
    drinks.find((d) => baseName(d.name) === wanted) ??
    null
  );
}

async function palateOf(
  input: string,
  ctx: ToolContext
): Promise<ToolResult<{ point: MapPoint; summary: PalateSummary }>> {
  const result = await ctx.readPalate(input);
  switch (result.status) {
    case 'invalid':
      return { ok: false, message: mcp.invalid(input) };
    case 'not-found':
      return { ok: false, message: mcp.notFound(input) };
    case 'unavailable':
      return {
        ok: false,
        message: mcp.unavailable(result.actor ? (result.actor.handle ?? result.actor.did) : input),
      };
    case 'no-palate':
      return { ok: false, message: mcp.noPalate(result.actor.handle ?? result.actor.did) };
  }
  const { actor, palate } = result;
  const region = quadrantFor(palate.x, palate.y);
  return {
    ok: true,
    data: {
      point: { x: palate.x, y: palate.y, aversions: palate.aversions },
      summary: {
        handle: actor.handle,
        did: actor.did,
        x: round(palate.x),
        y: round(palate.y),
        coordinate: formatCoordinate(palate.x, palate.y),
        region: {
          id: region.id,
          name: region.name,
          axis: region.axis,
          gloss: region.gloss,
          url: new URL(`/regions/${region.id}`, ctx.origin).toString(),
        },
        avoids: avoidedFlavours(palate.aversions),
        pours: palate.pours,
        updatedAt: palate.updatedAt,
        url: new URL(publicMapPath(actor.handle ?? actor.did), ctx.origin).toString(),
      },
    },
  };
}

export async function getPalate(
  input: string,
  ctx: ToolContext
): Promise<ToolResult<PalateSummary & { nearest: DrinkSummary[] }>> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const nearest = nearestDrinks(found.data.point).map((d) => summarize(d, ctx));
  return { ok: true, data: { ...found.data.summary, nearest } };
}

export async function recommendDrinks(
  input: string,
  options: { count?: number; type?: Drink['type'] },
  ctx: ToolContext
): Promise<ToolResult<{ palate: PalateSummary; drinks: (DrinkSummary & { distance: number })[] }>> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const { point, summary } = found.data;
  const pool = options.type ? drinkDatabase.filter((d) => d.type === options.type) : drinkDatabase;
  const drinks = nearestDrinks(point, options.count ?? 5, pool).map((d) => ({
    ...summarize(d, ctx),
    distance: round(calculateDistance(point, d)),
  }));
  return { ok: true, data: { palate: summary, drinks } };
}

export interface RankedItem extends DrinkSummary {
  /** The name as it was on the menu. */
  item: string;
  distance: number;
  /** Why they might pass on it, when a flavour they avoid is in it. */
  caution: string | null;
}

export async function rankMenu(
  input: string,
  items: string[],
  ctx: ToolContext
): Promise<
  ToolResult<{ palate: PalateSummary; ranked: RankedItem[]; unplaced: { item: string; reason: string }[] }>
> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const { point, summary } = found.data;

  const ranked: RankedItem[] = [];
  const unplaced: { item: string; reason: string }[] = [];
  for (const item of items) {
    const drink = matchDrink(item);
    if (!drink) {
      unplaced.push({ item, reason: mcp.unplaced });
      continue;
    }
    const avoided = clashes(drink, point.aversions);
    ranked.push({
      item,
      ...summarize(drink, ctx),
      distance: round(calculateDistance(point, drink)),
      caution: avoided.length > 0 ? mcp.avoids(avoided) : null,
    });
  }
  // A drink they avoid still sits where it sits; it goes below the ones they don't.
  ranked.sort(
    (a, b) =>
      Number(!!a.caution) - Number(!!b.caution) ||
      a.distance - b.distance ||
      a.name.localeCompare(b.name)
  );
  return { ok: true, data: { palate: summary, ranked, unplaced } };
}

export async function comparePalates(
  first: string,
  second: string,
  ctx: ToolContext
): Promise<
  ToolResult<{
    first: PalateSummary;
    second: PalateSummary;
    distance: number;
    description: string;
    firstWouldOrder: DrinkSummary | null;
    secondWouldOrder: DrinkSummary | null;
    shared: DrinkSummary | null;
  }>
> {
  const [a, b] = await Promise.all([palateOf(first, ctx), palateOf(second, ctx)]);
  if (!a.ok) return a;
  if (!b.ok) return b;
  const overlap = compareMaps(a.data.point, b.data.point);
  const maybe = (d: Drink | null) => (d ? summarize(d, ctx) : null);
  return {
    ok: true,
    data: {
      first: a.data.summary,
      second: b.data.summary,
      distance: round(overlap.distance),
      description: overlap.description,
      firstWouldOrder: maybe(overlap.theirs),
      secondWouldOrder: maybe(overlap.yours),
      shared: maybe(overlap.shared),
    },
  };
}

export function searchDrinks(query: string, ctx: ToolContext, limit = 10): ToolResult<{ drinks: DrinkSummary[] }> {
  const wanted = normalize(query);
  const exact = matchDrink(query);
  const hits = wanted
    ? drinkDatabase.filter((d) => d !== exact && normalize(d.name).includes(wanted))
    : [];
  const drinks = [...(exact ? [exact] : []), ...hits.sort((a, b) => a.name.localeCompare(b.name))]
    .slice(0, limit)
    .map((d) => summarize(d, ctx));
  if (drinks.length === 0) return { ok: false, message: mcp.noMatches(query) };
  return { ok: true, data: { drinks } };
}

export interface DraftResult {
  /** Opens the pour form with the draft in it. */
  url: string;
  draft: PourDraft;
  /** Whether the drink is on the map, and so can move the coordinate. */
  onMap: boolean;
  message: string;
}

/**
 * A pour for the person to confirm in Cotidal: a link, never a write. The
 * drink is given its map name when it has one, so the form and the ledger
 * join it to the map; anything else is kept as they said it.
 */
export function draftPour(
  input: { drink: string; atHome?: boolean; bar?: string; whatWasOff?: string[]; notes?: string[]; note?: string },
  ctx: ToolContext
): ToolResult<DraftResult> {
  const onMap = matchDrink(input.drink);
  const draft = cleanDraft({
    drink: onMap?.name ?? input.drink,
    atHome: input.atHome,
    bar: input.bar,
    deviations: input.whatWasOff,
    cata: input.notes,
    note: input.note,
  });
  if (!draft) return { ok: false, message: mcp.noDrink };
  return {
    ok: true,
    data: {
      url: new URL(draftPath(draft), ctx.origin).toString(),
      draft,
      onMap: !!onMap,
      message: mcp.draftReady,
    },
  };
}
