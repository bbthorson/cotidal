import { mcp } from '../copy';
import { drinkHeight } from '../palate/terrain';
import { compareWith } from '../palate/compare';
import { quadrantFor } from '../map/coordinates';
import { menuHandoffHref } from '../map/map-url';
import { matchDrink } from '../drinks/search';
import {
  clashingAversions,
  placeDirectional,
  splitMenuLine,
  suggestClosestDrink,
  type DirectionalConfidence,
} from '../drinks/ingredient-match';
import {
  bearing,
  clashes,
  palateOf,
  summarize,
  type Bearing,
  type DrinkSummary,
  type PalateSummary,
  type ToolContext,
  type ToolResult,
} from './tool-helpers';

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
  /** Directional placement from listed ingredients (honest estimate, no ratios). */
  directional?: {
    region: string;
    confidence: DirectionalConfidence;
    matchedIngredients: string[];
    way: string;
  };
}

export async function rankMenu(
  input: string,
  items: MenuEntry[],
  ctx: ToolContext,
  bar?: string
): Promise<
  ToolResult<{
    palate: PalateSummary;
    ranked: RankedItem[];
    unplaced: UnplacedItem[];
    mapUrl: string;
  }>
> {
  const found = await palateOf(input, ctx);
  if (!found.ok) return found;
  const p = found.data;
  const { point, summary } = p;
  const side = {
    terrain: p.terrain,
    point: { x: point.x, y: point.y },
    aversions: point.aversions,
  };

  const ranked: (RankedItem & { height: number })[] = [];
  const unplaced: UnplacedItem[] = [];
  const handoffLines: string[] = [];

  for (const raw of items) {
    const parsed =
      typeof raw === 'string'
        ? splitMenuLine(raw)
        : {
            name: raw.name.trim(),
            description: [raw.description, ...(raw.ingredients ?? [])].filter(Boolean).join(', ') || undefined,
          };
    const label = typeof raw === 'string' ? raw : raw.name;
    handoffLines.push(parsed.description ? `${parsed.name || label} — ${parsed.description}` : parsed.name || label);

    const drink = matchDrink(parsed.name || label);
    if (!drink) {
      const text = [parsed.name, parsed.description].filter(Boolean).join(' ');
      const avoided = clashingAversions(text, point.aversions).map((k) => mcp.flavours[k]);
      const directional = parsed.description ? placeDirectional(text) : null;
      const relative = parsed.description ? (directional?.closestClassic ?? suggestClosestDrink(text)) : null;
      const dirWay = directional
        ? compareWith(side, {
            kind: 'drink',
            drink: {
              name: label,
              slug: '',
              type: 'Cocktail',
              x: directional.x,
              y: directional.y,
              hasSmoke: directional.aversions.smoke,
              isBitter: directional.aversions.bitter,
              hasAnise: directional.aversions.anise,
              tags: [],
            },
          }).words
        : null;
      unplaced.push({
        item: label,
        reason: mcp.unplaced,
        ...(avoided.length > 0 ? { caution: mcp.avoids(avoided) } : {}),
        ...(relative ? { closestClassic: summarize(relative, ctx) } : {}),
        ...(directional && dirWay
          ? {
              directional: {
                region: quadrantFor(directional.x, directional.y).name,
                confidence: directional.confidence,
                matchedIngredients: directional.primitives.map((pr) => pr.name),
                way: dirWay,
              },
            }
          : {}),
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
  return {
    ok: true,
    data: {
      palate: summary,
      ranked: ranked.map(({ height: _height, ...r }) => r),
      unplaced,
      mapUrl: menuHandoffHref(ctx.origin, handoffLines, bar),
    },
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
