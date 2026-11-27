import type { Drink } from '../drinks/data';
import { quadrantFor } from '../map/coordinates';
import { formatCoordinate } from '../map/coordinates';
import type { MapPoint } from '../palate/overlap';
import { mcp, publicMap, taste as tasteCopy } from '../copy';
import { leanings, type Terrain } from '../palate/terrain';
import { evidenceFor, nearestHilltop, ratingsOf, terrainOf } from '../palate/taste-reading';
import { titleOf, type Register } from '../drinks/register';
import { publicMapPath } from '../atproto/paths';
import type { PublicPalateResult } from '../atproto/public-read';
import type { PublicVenueResult } from '../atproto/venue-read';
import { wayTo } from '../drinks/search';
import type { LogDrinkOptions } from '../api-client';
import type { PourRecord } from '../atproto/records';
import type { LogPourResult } from '../pours/pours.server';

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

export type Aversions = MapPoint['aversions'];

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
export interface Person {
  point: MapPoint;
  terrain: Terrain;
  rated: Map<string, number>;
  summary: PalateSummary;
}

export function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function avoidedFlavours(aversions: Aversions): string[] {
  return (Object.keys(mcp.flavours) as (keyof Aversions)[])
    .filter((k) => aversions[k])
    .map((k) => mcp.flavours[k]);
}

/** The flavours in `drink` that someone with `aversions` avoids. */
export function clashes(drink: Drink, aversions: Aversions): string[] {
  const out: string[] = [];
  if (aversions.smoke && drink.hasSmoke) out.push(mcp.flavours.smoke);
  if (aversions.bitter && drink.isBitter) out.push(mcp.flavours.bitter);
  if (aversions.anise && drink.hasAnise) out.push(mcp.flavours.anise);
  return out;
}

export function bearing(p: Person, drink: Drink, ctx: ToolContext): Bearing {
  const { words, distance } = wayTo(nearestHilltop(p.terrain, drink, p.point), drink);
  const near = evidenceFor(p.terrain, drink).map((e) => ({ ...e, name: titleOf(ctx.register, e.name) }));
  return { reason: publicMap.reason(near, p.rated.get(drink.name)), distance, way: words };
}

export function summarize(drink: Drink, ctx: ToolContext): DrinkSummary {
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

export async function palateOf(input: string, ctx: ToolContext): Promise<ToolResult<Person>> {
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
