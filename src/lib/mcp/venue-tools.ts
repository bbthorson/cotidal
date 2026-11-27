import { mcp } from '../copy';
import type { Drink } from '../drinks/data';
import { drinkHeight } from '../palate/terrain';
import { HEIGHT_BAND } from '../palate/scoring';
import { menuHandoffHref } from '../map/map-url';
import { matchDrink } from '../drinks/search';
import {
  clashingAversions,
  placeDirectional,
  splitMenuLine,
  suggestClosestDrink,
  type AversionFlags,
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

/**
 * How a menu item came to stand where it does: it is a drink on the map
 * (`catalog`), its listed ingredients place it (`ingredients`, an estimate
 * with no ratios behind it), or it stands where the classic it builds on does
 * (`classic`: named for it, or built on its defining ingredients).
 */
export type Placement = 'catalog' | 'ingredients' | 'classic';

export interface RankedItem extends DrinkSummary, Bearing {
  /** The name as it was on the menu. */
  item: string;
  placement: Placement;
  /** For `ingredients`: how much the listed ingredients say. */
  confidence?: DirectionalConfidence;
  /** For `ingredients`: what was read from the menu's words. */
  matchedIngredients?: string[];
  /** For `ingredients` and `classic`: the closest drink on the map, when one is clear. */
  closestClassic?: DrinkSummary | null;
  /** Why they might pass on it, when a flavour they avoid is in it. */
  caution: string | null;
}

export type MenuEntry = string | { name: string; description?: string; ingredients?: string[] };

/** An item nothing places: no drink on the map by its name, and too few ingredients listed. */
export interface UnplacedItem {
  item: string;
  reason: string;
  /** Avoided-flavour warning inferred from the item's name or description, when any. */
  caution?: string | null;
}

/** A house drink as a point on the map, so it is measured as any drink is. */
function houseDrink(name: string, x: number, y: number, aversions: AversionFlags): Drink {
  return {
    name,
    slug: '',
    type: 'Cocktail',
    x,
    y,
    hasSmoke: aversions.smoke,
    isBitter: aversions.bitter,
    hasAnise: aversions.anise,
    tags: [],
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

  const ranked: (RankedItem & { height: number })[] = [];
  const unplaced: UnplacedItem[] = [];
  const handoffLines: string[] = [];

  const place = (label: string, drink: Drink, extra: Pick<RankedItem, 'placement' | 'confidence' | 'matchedIngredients' | 'closestClassic'>, avoided: string[]) => {
    ranked.push({
      item: label,
      ...summarize(drink, ctx),
      ...bearing(p, drink, ctx),
      ...extra,
      caution: avoided.length > 0 ? mcp.avoids(avoided) : null,
      height: drinkHeight(p.terrain, drink).rating,
    });
  };

  for (const raw of items) {
    const parsed =
      typeof raw === 'string'
        ? splitMenuLine(raw)
        : {
            name: raw.name.trim(),
            description: [raw.description, ...(raw.ingredients ?? [])].filter(Boolean).join(', ') || undefined,
          };
    const label = typeof raw === 'string' ? raw : raw.name;
    const name = parsed.name || label;
    handoffLines.push(parsed.description ? `${name} — ${parsed.description}` : name);

    const text = [parsed.name, parsed.description].filter(Boolean).join(' ');
    const avoided = clashingAversions(text, point.aversions).map((k) => mcp.flavours[k]);
    const drink = matchDrink(name);
    if (drink) {
      // What the drink carries, and anything this bar's version adds ("Mexican Fernet" in a Cuba Libre).
      place(label, drink, { placement: 'catalog' }, [...new Set([...clashes(drink, point.aversions), ...avoided])]);
      continue;
    }

    const directional = parsed.description ? placeDirectional(text, undefined, { name }) : null;
    const classic = directional?.closestClassic ?? suggestClosestDrink(text, undefined, { name });
    if (directional) {
      place(
        label,
        houseDrink(label, directional.x, directional.y, directional.aversions),
        {
          placement: 'ingredients',
          confidence: directional.confidence,
          matchedIngredients: directional.primitives.map((pr) => pr.name),
          closestClassic: classic ? summarize(classic, ctx) : null,
        },
        avoided
      );
    } else if (classic) {
      // What the classic carries, and anything the menu's own words add.
      const cautions = [...new Set([...clashes(classic, point.aversions), ...avoided])];
      place(label, classic, { placement: 'classic', closestClassic: summarize(classic, ctx) }, cautions);
    } else {
      unplaced.push({
        item: label,
        reason: mcp.unplaced,
        ...(avoided.length > 0 ? { caution: mcp.avoids(avoided) } : {}),
      });
    }
  }
  // Highest on their ground first, in bands as their menu orders it (`HEIGHT_BAND`); inside a band a
  // drink on the map goes before an estimate. A drink they avoid still stands where it stands, and
  // goes below the ones they don't. The height orders the list and is never shown.
  const band = (h: number) => Math.floor(Math.max(0, 9 - h) / HEIGHT_BAND);
  ranked.sort(
    (a, b) =>
      Number(!!a.caution) - Number(!!b.caution) ||
      band(a.height) - band(b.height) ||
      Number(a.placement !== 'catalog') - Number(b.placement !== 'catalog') ||
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
