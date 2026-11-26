import { drinkDatabase, type Drink } from '../data';
import { quadrantFor } from '../quadrant';
import { formatCoordinate } from '../coordinate';
import { compareTerrains, TOP, type MapPoint } from '../overlap';
import { compareWith } from '../compare';
import { mcp, publicMap, taste as tasteCopy } from '../copy';
import { drinkHeight, leanings, type Terrain } from '../terrain';
import { avoids, evidenceFor, menuOf, nearestHilltop, ratingsOf, terrainOf } from '../taste-reading';
import { titleOf } from '../register';
import { publicMapPath } from '../atproto/paths';
import type { PublicPalateResult } from '../atproto/public-read';
import type { PublicVenueResult } from '../atproto/venue-read';
import { readFollowedPalates, type FollowedOverlap } from '../atproto/follows-overlap';
import type { Register } from '../register';
import { cleanDraft, draftPath, type PourDraft } from '../pour-draft';
import { matchDrink, normalizeName } from '../drink-match';
import { wayTo } from '../drink-search';
import { clashingAversions, splitMenuLine, suggestClosestDrink } from '../ingredient-match';
import { pour as pourCopy } from '../copy';
import { hedonicToRating } from '../pour-entry';
import { DISLIKED_AT } from '../scoring';
import type { LogDrinkOptions } from '../api-client';
import type { PourRecord } from '../atproto/records';
import type { LogPourResult } from '../pours.server';

/**
 * What the `/mcp` tools answer, as plain functions.
 *
 * Read-only, and computed rather than generated: every answer here comes from
 * the same functions `/p/<handle>` draws from (`taste-reading.ts`,
 * `overlap.ts`): a person is read as their taste, the ground their questions
 * and pours make, never one point or one region, and a drink is said by what
 * put it where it stands, never by a predicted score. So a chat assistant and
 * the page give the same answer twice
 * (docs/generation.md). The assistant on the other end is the only model
 * involved, and it only ever reads results.
 *
 * Nothing here touches the network itself: the palate reader and the
 * register are passed in, so tests run with a fake reader and no
 * content collection.
 */

export type ReadPalate = (actor: string) => Promise<PublicPalateResult>;
export type ReadVenue = (actor: string) => Promise<PublicVenueResult>;

export interface ToolContext {
  readPalate: ReadPalate;
  readVenue?: ReadVenue;
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
  /** Their taste in the axes' words, one phrase per hill (`leanings`): "crisp and sweet · rich and savory". */
  leans: string;
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

/**
 * Where a drink stands for someone, in the words the app uses, so an
 * assistant repeats Cotidal's reading of the map instead of making its own:
 * what put it there ("Near their Manhattan (9)"), and how far and which way it
 * lies from the nearest of their hilltops ("crisper, more savory").
 */
export interface Bearing {
  reason: string;
  distance: number;
  way: string;
}

/** A person as the tools read them: their summary, and their taste as ground. */
interface Person {
  point: MapPoint;
  terrain: Terrain;
  rated: Map<string, number>;
  summary: PalateSummary;
}

function bearing(p: Person, drink: Drink, ctx: ToolContext): Bearing {
  const { words, distance } = wayTo(nearestHilltop(p.terrain, drink, p.point), drink);
  const near = evidenceFor(p.terrain, drink).map((e) => ({ ...e, name: titleOf(ctx.register, e.name) }));
  return { reason: publicMap.reason(near, p.rated.get(drink.name)), distance, way: words };
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


async function palateOf(input: string, ctx: ToolContext): Promise<ToolResult<Person>> {
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
  const pours = result.taste?.pours ?? [];
  const terrain = terrainOf(result.taste?.start ?? null, palate, pours);
  return {
    ok: true,
    data: {
      point: { x: palate.x, y: palate.y, aversions: palate.aversions },
      terrain,
      rated: ratingsOf(pours),
      summary: {
        handle: actor.handle,
        did: actor.did,
        x: round(palate.x),
        y: round(palate.y),
        coordinate: formatCoordinate(palate.x, palate.y),
        leans: tasteCopy.phrases(leanings(terrain, 2)),
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
): Promise<ToolResult<PalateSummary & { menu: (DrinkSummary & Bearing)[] }>> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const p = found.data;
  const menu = menuOf(p.terrain, p.point.aversions, p.rated, 3).map((d) => ({ ...summarize(d, ctx), ...bearing(p, d, ctx) }));
  return { ok: true, data: { ...p.summary, menu } };
}

export async function recommendDrinks(
  input: string,
  options: { count?: number; type?: Drink['type'] },
  ctx: ToolContext
): Promise<ToolResult<{ palate: PalateSummary; drinks: (DrinkSummary & Bearing)[] }>> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const p = found.data;
  const pool = options.type ? drinkDatabase.filter((d) => d.type === options.type) : drinkDatabase;
  const drinks = menuOf(p.terrain, p.point.aversions, p.rated, options.count ?? 5, pool).map((d) => ({
    ...summarize(d, ctx),
    ...bearing(p, d, ctx),
  }));
  return { ok: true, data: { palate: p.summary, drinks } };
}

export interface RankedItem extends DrinkSummary, Bearing {
  /** The name as it was on the menu. */
  item: string;
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
  const p = found.data;
  const { point, summary } = p;

  const ranked: (RankedItem & { height: number })[] = [];
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
      ...bearing(p, drink, ctx),
      caution: avoided.length > 0 ? mcp.avoids(avoided) : null,
      height: drinkHeight(p.terrain, drink).rating,
    });
  }
  // Highest on their ground first, as their menu orders it; a drink they avoid still stands where it
  // stands, and goes below the ones they don't. The height orders the list and is never shown.
  ranked.sort(
    (a, b) =>
      Number(!!a.caution) - Number(!!b.caution) ||
      b.height - a.height ||
      a.name.localeCompare(b.name)
  );
  return { ok: true, data: { palate: summary, ranked: ranked.map(({ height: _height, ...r }) => r), unplaced } };
}

export async function comparePalates(
  first: string,
  second: string,
  ctx: ToolContext
): Promise<
  ToolResult<{
    first: PalateSummary;
    second: PalateSummary;
    /** How many of the first's top ten are in the second's (`compareTerrains`). */
    inCommon: number;
    /** How far the second's highest hill lies from the first's nearest, and which way (`compareWith`), as `/p` says it. */
    distance: number;
    way: string;
    description: string;
    firstWouldOrder: DrinkSummary | null;
    secondWouldOrder: DrinkSummary | null;
    shared: DrinkSummary | null;
  }>
> {
  const [a, b] = await Promise.all([palateOf(first, ctx), palateOf(second, ctx)]);
  if (!a.ok) return a;
  if (!b.ok) return b;
  // One comparison, as `/p` makes it: the second is a set of points measured against the first.
  const side = (p: typeof a.data) => ({ terrain: p.terrain, aversions: p.point.aversions, point: { x: p.point.x, y: p.point.y } });
  const c = compareWith(side(a.data), { kind: 'person', side: side(b.data) });
  const overlap = c.overlap!;
  const maybe = (d: Drink | null) => (d ? summarize(d, ctx) : null);
  return {
    ok: true,
    data: {
      first: a.data.summary,
      second: b.data.summary,
      inCommon: overlap.inCommon,
      distance: c.distance,
      way: c.words,
      description: publicMap.inCommon(overlap.inCommon, TOP),
      firstWouldOrder: maybe(overlap.firstOnly),
      secondWouldOrder: maybe(overlap.secondOnly),
      shared: maybe(overlap.shared),
    },
  };
}

export type GroupDrink = DrinkSummary;

/**
 * Shared recommendations for a table of 2–8 people: respects every person's
 * aversions, leaves out anything one of them rated low, and puts first the
 * drinks that stand highest for whoever at the table they suit least — the
 * best worst case, on each person's own ground. The order is the answer; no
 * height is shown.
 */
export async function recommendForGroup(
  handles: string[],
  options: { count?: number; type?: Drink['type'] },
  ctx: ToolContext
): Promise<
  ToolResult<{
    people: PalateSummary[];
    drinks: GroupDrink[];
    widestContrast: { first: string; second: string; inCommon: number; description: string } | null;
  }>
> {
  const unique = [...new Set(handles.map((h) => h.trim()).filter(Boolean))];
  if (unique.length < 2) return { ok: false, message: mcp.needGroup };

  const results = await Promise.all(unique.map((h) => palateOf(h, ctx)));
  const resolved: Person[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    resolved.push(r.data);
  }

  const pool = (options.type ? drinkDatabase.filter((d) => d.type === options.type) : drinkDatabase).filter((drink) =>
    resolved.every((p) => !avoids(drink, p.point.aversions) && !((p.rated.get(drink.name) ?? Infinity) <= DISLIKED_AT))
  );

  const count = Math.min(Math.max(options.count ?? 5, 1), 15);
  const drinks: GroupDrink[] = pool
    .map((drink) => {
      const heights = resolved.map((p) => drinkHeight(p.terrain, drink).rating);
      return { drink, worst: Math.min(...heights), mean: heights.reduce((a, b) => a + b, 0) / heights.length };
    })
    .sort((a, b) => b.worst - a.worst || b.mean - a.mean || a.drink.name.localeCompare(b.drink.name))
    .slice(0, count)
    .map(({ drink }) => summarize(drink, ctx));

  // The two at the table whose maps part most: the fewest of the first's top drinks in the second's.
  let widestContrast: { first: string; second: string; inCommon: number; description: string } | null = null;
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const { inCommon } = compareTerrains(
        { terrain: resolved[i].terrain, aversions: resolved[i].point.aversions },
        { terrain: resolved[j].terrain, aversions: resolved[j].point.aversions }
      );
      if (!widestContrast || inCommon < widestContrast.inCommon) {
        widestContrast = {
          first: resolved[i].summary.handle ?? resolved[i].summary.did,
          second: resolved[j].summary.handle ?? resolved[j].summary.did,
          inCommon,
          description: publicMap.inCommon(inCommon, TOP),
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
  /**
   * How far it sits from the person asked about, and which way, when a handle
   * was given: what an assistant needs to answer "would I like X?" from the
   * map instead of guessing for a drink no list happened to include.
   */
  fromThem?: Bearing & { handle: string | null; avoided: string[] };
}

export async function getDrink(name: string, ctx: ToolContext, from?: string): Promise<ToolResult<DrinkDetail>> {
  const drink = matchDrink(name);
  if (!drink) return { ok: false, message: mcp.noDrinkFound(name) };
  const entry = ctx.register[drink.name];
  const detail: DrinkDetail = {
    ...summarize(drink, ctx),
    hasSmoke: drink.hasSmoke,
    isBitter: drink.isBitter,
    hasAnise: drink.hasAnise,
    tags: drink.tags,
    build: entry?.build ?? null,
  };
  if (!from) return { ok: true, data: detail };
  const found = await palateOf(from, ctx);
  if (!found.ok) return found;
  const p = found.data;
  return {
    ok: true,
    data: { ...detail, fromThem: { handle: p.summary.handle, ...bearing(p, drink, ctx), avoided: clashes(drink, p.point.aversions) } },
  };
}

/**
 * Read a claimed bar's live `app.cotidal.venue` + `app.cotidal.menu` by handle.
 * When `drinker` is supplied (or on `/mcp/me` for the signed-in member), ranks
 * the bar's menu against their palate automatically.
 */
export async function getBarMenu(
  bar: string,
  drinker: string | undefined,
  ctx: ToolContext
): Promise<
  ToolResult<{
    venue: {
      name: string;
      handle: string | null;
      did: string;
      description: string | null;
      website: string | null;
      url: string;
    };
    menuTitle: string | null;
    publishedAt: string | null;
    items: { name: string; description: string | null; placed: DrinkSummary | null }[];
    ranking?: { palate: PalateSummary; ranked: RankedItem[]; unplaced: UnplacedItem[] };
  }>
> {
  if (!ctx.readVenue) return { ok: false, message: mcp.unavailable(bar) };
  const res = await ctx.readVenue(bar);
  switch (res.status) {
    case 'invalid':
      return { ok: false, message: mcp.invalid(bar) };
    case 'not-found':
      return { ok: false, message: mcp.notFound(bar) };
    case 'unavailable':
      return { ok: false, message: mcp.unavailable(res.actor?.handle ?? res.actor?.did ?? bar) };
    case 'no-venue':
      return { ok: false, message: `${res.actor.handle ?? res.actor.did} has not published a venue record yet.` };
  }

  const { actor, venue } = res;
  const flatItems = (venue.menu?.sections ?? []).flatMap((s) => s.items);
  const items = flatItems.map((i) => ({
    name: i.name,
    description: i.description,
    placed: i.placed ? summarize(i.placed, ctx) : null,
  }));

  let ranking: { palate: PalateSummary; ranked: RankedItem[]; unplaced: UnplacedItem[] } | undefined;
  if (drinker && flatItems.length > 0) {
    const entries: MenuEntry[] = flatItems.map((i) => ({
      name: i.name,
      ...(i.description ? { description: i.description } : {}),
    }));
    const ranked = await rankMenu(drinker, entries, ctx);
    if (ranked.ok) ranking = ranked.data;
  }

  return {
    ok: true,
    data: {
      venue: {
        name: venue.name,
        handle: actor.handle,
        did: actor.did,
        description: venue.description,
        website: venue.website,
        url: new URL(`/v/${encodeURIComponent(actor.handle ?? actor.did)}`, ctx.origin).toString(),
      },
      menuTitle: venue.menu?.title ?? null,
      publishedAt: venue.menu?.publishedAt ?? null,
      items,
      ...(ranking ? { ranking } : {}),
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

/** Bluesky follows of the signed-in member who have published a Cotidal palate. */
export async function myFollows(
  ctx: ToolContext,
  readFollows: typeof import('../atproto/follows-overlap').readFollowedPalates = readFollowedPalates
): Promise<ToolResult<{ friends: FollowedOverlap[] }>> {
  if (!ctx.member) return { ok: false, message: mcp.memberOnly };
  const own = await palateOf(ctx.member.did, ctx);
  if (!own.ok) return own;
  const friends = await readFollows(
    ctx.member.did,
    { terrain: own.data.terrain, aversions: own.data.point.aversions },
    { readPalate: ctx.readPalate }
  );
  return { ok: true, data: { friends } };
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
