import { drinkDatabase, type Drink } from '../data';
import { calculateDistance } from '../scoring';
import { quadrantFor, regionPath } from '../quadrant';
import { formatCoordinate } from '../coordinate';
import { compareMaps, describeDistance, nearestDrinks, type MapPoint } from '../overlap';
import { mcp } from '../copy';
import { publicMapPath } from '../atproto/paths';
import type { PublicPalateResult } from '../atproto/public-read';
import type { Register } from '../register';
import { cleanDraft, draftPath, type PourDraft } from '../pour-draft';
import { matchDrink, normalizeName } from '../drink-match';
import { clashingAversions, splitMenuLine, suggestClosestDrink } from '../ingredient-match';
import { pour as pourCopy } from '../copy';
import { hedonicToRating } from '../pour-entry';
import type { LogDrinkOptions } from '../api-client';
import type { PourRecord } from '../atproto/records';
import type { LogPourResult } from '../pours.server';

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
  /** At `/mcp/me` only: the member the assistant was signed in as. */
  member?: MemberTools;
}

/**
 * What `/mcp/me` can do as its member, through their own AT-Proto session
 * (restored from the DID the grant carries). Each answers `null` when that
 * session cannot be restored: the member signed out here, or their host
 * revoked it.
 */
export interface MemberTools {
  did: string;
  recentPours(limit: number): Promise<PourRecord[] | null>;
  /** The one pipeline every pour goes through (`logPour`, src/lib/pours.server.ts). */
  logPour(options: Partial<LogDrinkOptions>): Promise<LogPourResult | null>;
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
/** Re-exported: the chat tools match names the way every other caller does. */
export { matchDrink };
const normalize = normalizeName;


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
          url: new URL(regionPath(region.id), ctx.origin).toString(),
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

export type MenuEntry = string | { name: string; description?: string; ingredients?: string[] };

export interface UnplacedItem {
  item: string;
  reason: string;
  /** Avoided-flavour warning inferred from the item's description/ingredients, when any. */
  caution?: string | null;
  /** Closest structural classic on the map when ingredients make it clear. */
  closestClassic?: DrinkSummary | null;
}

export async function rankMenu(
  input: string,
  items: MenuEntry[],
  ctx: ToolContext
): Promise<
  ToolResult<{ palate: PalateSummary; ranked: RankedItem[]; unplaced: UnplacedItem[] }>
> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const { point, summary } = found.data;

  const ranked: RankedItem[] = [];
  const unplaced: UnplacedItem[] = [];
  for (const raw of items) {
    const parsed =
      typeof raw === 'string'
        ? splitMenuLine(raw)
        : {
            name: raw.name.trim(),
            description: [raw.description, ...(raw.ingredients ?? [])].filter(Boolean).join(', ') || undefined,
          };
    const label = typeof raw === 'string' ? raw : raw.name;
    const drink = matchDrink(parsed.name || label);
    if (!drink) {
      const text = [parsed.name, parsed.description].filter(Boolean).join(' ');
      const avoided = clashingAversions(text, point.aversions).map((k) => mcp.flavours[k]);
      const relative = parsed.description ? suggestClosestDrink(text) : null;
      unplaced.push({
        item: label,
        reason: mcp.unplaced,
        ...(avoided.length > 0 ? { caution: mcp.avoids(avoided) } : {}),
        ...(relative ? { closestClassic: summarize(relative, ctx) } : {}),
      });
      continue;
    }
    const avoided = clashes(drink, point.aversions);
    ranked.push({
      item: label,
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

export interface GroupDrink extends DrinkSummary {
  /** Largest distance to any person at the table (minimax objective). */
  maxDistance: number;
  /** Average distance across the table. */
  meanDistance: number;
}

/**
 * Shared recommendations for a table of 2–8 people: respects every person's
 * aversions and minimizes the worst-case distance across the group.
 */
export async function recommendForGroup(
  handles: string[],
  options: { count?: number; type?: Drink['type'] },
  ctx: ToolContext
): Promise<
  ToolResult<{
    people: PalateSummary[];
    drinks: GroupDrink[];
    widestContrast: { first: string; second: string; distance: number; description: string } | null;
  }>
> {
  const unique = [...new Set(handles.map((h) => h.trim()).filter(Boolean))];
  if (unique.length < 2) return { ok: false, message: mcp.needGroup };

  const results = await Promise.all(unique.map((h) => palateOf(h, ctx)));
  const resolved: { point: MapPoint; summary: PalateSummary }[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    resolved.push(r.data);
  }

  const pool = (options.type ? drinkDatabase.filter((d) => d.type === options.type) : drinkDatabase).filter((drink) =>
    resolved.every(({ point }) => clashes(drink, point.aversions).length === 0)
  );

  const count = Math.min(Math.max(options.count ?? 5, 1), 15);
  const drinks: GroupDrink[] = pool
    .map((drink) => {
      const dists = resolved.map(({ point }) => calculateDistance(point, drink));
      const maxDistance = Math.max(...dists);
      const meanDistance = dists.reduce((a, b) => a + b, 0) / dists.length;
      return {
        ...summarize(drink, ctx),
        maxDistance: round(maxDistance),
        meanDistance: round(meanDistance),
      };
    })
    .sort((a, b) => a.maxDistance - b.maxDistance || a.meanDistance - b.meanDistance || a.name.localeCompare(b.name))
    .slice(0, count);

  let widestContrast: { first: string; second: string; distance: number; description: string } | null = null;
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const d = calculateDistance(resolved[i].point, resolved[j].point);
      if (!widestContrast || d > widestContrast.distance) {
        widestContrast = {
          first: resolved[i].summary.handle ?? resolved[i].summary.did,
          second: resolved[j].summary.handle ?? resolved[j].summary.did,
          distance: round(d),
          description: describeDistance(d),
        };
      }
    }
  }

  return {
    ok: true,
    data: {
      people: resolved.map((r) => r.summary),
      drinks,
      widestContrast,
    },
  };
}

export interface DrinkDetail extends DrinkSummary {
  hasSmoke: boolean;
  isBitter: boolean;
  hasAnise: boolean;
  tags: Drink['tags'];
  /** Required ingredients from the register, when written up. */
  build: string | null;
}

export function getDrink(name: string, ctx: ToolContext): ToolResult<DrinkDetail> {
  const drink = matchDrink(name);
  if (!drink) return { ok: false, message: mcp.noDrinkFound(name) };
  const entry = ctx.register[drink.name];
  return {
    ok: true,
    data: {
      ...summarize(drink, ctx),
      hasSmoke: drink.hasSmoke,
      isBitter: drink.isBitter,
      hasAnise: drink.hasAnise,
      tags: drink.tags,
      build: entry?.build ?? null,
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

export interface PourSummary {
  drink: string;
  /** The point tapped on the 9-point scale, and its words. */
  hedonic: number;
  liked: string;
  where: string | null;
  atHome: boolean;
  whatWasOff: string[];
  notes: string[];
  note: string | null;
  wouldOrderAgain: boolean | null;
  at: string;
}

function summarizePour(p: PourRecord): PourSummary {
  return {
    drink: p.drink.name,
    hedonic: p.rating.hedonic,
    liked: pourCopy.hedonic[p.rating.hedonic - 1] ?? pourCopy.scoreOf(p.rating.hedonic),
    where: p.isHomePour ? null : (p.venue?.entity.name ?? null),
    atHome: !!p.isHomePour,
    whatWasOff: p.deviations ?? [],
    notes: p.cata ?? [],
    note: p.note ?? null,
    wouldOrderAgain: p.rating.wouldOrderAgain ?? null,
    at: p.createdAt,
  };
}

/** The member's own pours, newest first. Only at `/mcp/me`: nobody else's log is read. */
export async function myPours(
  count: number | undefined,
  ctx: ToolContext
): Promise<ToolResult<{ pours: PourSummary[] }>> {
  if (!ctx.member) return { ok: false, message: mcp.memberOnly };
  const pours = await ctx.member.recentPours(Math.min(Math.max(count ?? 10, 1), 50));
  if (!pours) return { ok: false, message: mcp.sessionGone };
  return { ok: true, data: { pours: pours.map(summarizePour) } };
}

export interface BarSummary {
  bar: string;
  pours: number;
  averageHedonic: number;
  lastVisit: string;
  topDrinks: string[];
}

/** Summary of bars the signed-in member has poured at, most visited first. */
export async function myBars(ctx: ToolContext): Promise<ToolResult<{ bars: BarSummary[] }>> {
  if (!ctx.member) return { ok: false, message: mcp.memberOnly };
  const pours = await ctx.member.recentPours(50);
  if (!pours) return { ok: false, message: mcp.sessionGone };

  const byBar = new Map<string, { name: string; pours: PourRecord[] }>();
  for (const p of pours) {
    if (p.isHomePour) continue;
    const raw = p.venue?.entity.name?.trim();
    if (!raw || raw === 'Unknown Venue') continue;
    const key = normalize(raw);
    const group = byBar.get(key);
    if (group) group.pours.push(p);
    else byBar.set(key, { name: raw, pours: [p] });
  }

  const bars: BarSummary[] = [...byBar.values()]
    .map(({ name, pours: list }) => {
      const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const avg = list.reduce((s, p) => s + p.rating.hedonic, 0) / list.length;
      const topDrinks = [
        ...new Set(
          [...list]
            .filter((p) => p.rating.hedonic >= 7)
            .sort((a, b) => b.rating.hedonic - a.rating.hedonic)
            .map((p) => p.drink.name)
        ),
      ].slice(0, 3);
      return {
        bar: name,
        pours: list.length,
        averageHedonic: round(avg),
        lastVisit: sorted[0].createdAt,
        topDrinks,
      };
    })
    .sort((a, b) => b.pours - a.pours || new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

  return { ok: true, data: { bars } };
}

export interface LogPourInput {
  drink: string;
  /** 1–9, as the member said it. Required: the tool never estimates one. */
  hedonic: number;
  atHome?: boolean;
  bar?: string;
  whatWasOff?: string[];
  notes?: string[];
  note?: string;
  wouldOrderAgain?: boolean;
}

/**
 * Log a pour as the member, through the same `logPour` the form uses. What
 * goes in is only what they said, cut and checked as a draft is
 * (`cleanDraft`): no bar for a pour at home, known fault and note ids only,
 * text cut to the form's limits. The rating is theirs and required.
 * Nothing is cross-posted to Bluesky from here.
 */
export async function logMemberPour(
  input: LogPourInput,
  ctx: ToolContext
): Promise<ToolResult<{ logged: PourSummary & { onMap: boolean }; coordinate: string; uri: string; message: string }>> {
  if (!ctx.member) return { ok: false, message: mcp.memberOnly };
  if (!Number.isInteger(input.hedonic) || input.hedonic < 1 || input.hedonic > 9) {
    return { ok: false, message: mcp.needRating };
  }
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

  const options: Partial<LogDrinkOptions> = {
    drinkName: draft.drink,
    rating: hedonicToRating(input.hedonic),
    isHomePour: !!draft.atHome,
    ...(draft.bar ? { venue: { name: draft.bar } } : {}),
    ...(draft.deviations?.length ? { deviations: draft.deviations } : {}),
    ...(draft.cata?.length ? { cata: draft.cata } : {}),
    ...(draft.note ? { note: draft.note } : {}),
    ...(typeof input.wouldOrderAgain === 'boolean' ? { wouldOrderAgain: input.wouldOrderAgain } : {}),
  };
  const result = await ctx.member.logPour(options);
  if (!result) return { ok: false, message: mcp.sessionGone };
  if (!result.ok) return { ok: false, message: result.error };

  return {
    ok: true,
    data: {
      logged: {
        drink: draft.drink,
        hedonic: input.hedonic,
        liked: pourCopy.hedonic[input.hedonic - 1],
        where: draft.atHome ? null : (draft.bar ?? null),
        atHome: !!draft.atHome,
        whatWasOff: draft.deviations ?? [],
        notes: draft.cata ?? [],
        note: draft.note ?? null,
        wouldOrderAgain: input.wouldOrderAgain ?? null,
        at: new Date().toISOString(),
        onMap: !!onMap,
      },
      coordinate: formatCoordinate(result.profile.x, result.profile.y),
      uri: result.uri,
      message: mcp.logged,
    },
  };
}
