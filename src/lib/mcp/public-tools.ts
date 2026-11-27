import { drinkDatabase, type Drink } from '../drinks/data';
import { TOP } from '../palate/overlap';
import { compareWith } from '../palate/compare';
import { mcp, publicMap } from '../copy';
import { menuOf } from '../palate/taste-reading';
import { rankForTable, widestContrastPair, type TableMember } from '../palate/overlays';
import { cleanDraft, draftPath, type PourDraft } from '../pours/pour-draft';
import { matchDrink, normalizeName } from '../drinks/search';
import {
  bearing,
  clashes,
  palateOf,
  summarize,
  type Bearing,
  type DrinkSummary,
  type PalateSummary,
  type Person,
  type ToolContext,
  type ToolResult,
} from './tool-helpers';

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
 * Shared recommendations for a table of 2–8 people, delegating to the
 * centralized `rankForTable` / `widestContrastPair` rules in `palate/overlays.ts`.
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

  const members: TableMember[] = resolved.map((p) => ({
    id: p.summary.did,
    label: p.summary.handle ?? p.summary.did,
    terrain: p.terrain,
    aversions: p.point.aversions,
    rated: p.rated,
  }));

  const pool = options.type ? drinkDatabase.filter((d) => d.type === options.type) : drinkDatabase;
  const count = Math.min(Math.max(options.count ?? 5, 1), 15);
  const drinks: GroupDrink[] = rankForTable(members, pool, count).map((drink) => summarize(drink, ctx));
  const contrast = widestContrastPair(members);

  return {
    ok: true,
    data: {
      people: resolved.map((r) => r.summary),
      drinks,
      widestContrast: contrast
        ? { ...contrast, description: publicMap.inCommon(contrast.inCommon, TOP) }
        : null,
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
   * was given.
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

export function searchDrinks(query: string, ctx: ToolContext, limit = 10): ToolResult<{ drinks: DrinkSummary[] }> {
  const wanted = normalizeName(query);
  const exact = matchDrink(query);
  const hits = wanted
    ? drinkDatabase.filter((d) => d !== exact && normalizeName(d.name).includes(wanted))
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
 * A pour for the person to confirm in Cotidal: a link, never a write.
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
