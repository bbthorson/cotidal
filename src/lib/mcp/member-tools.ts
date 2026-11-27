import { formatCoordinate } from '../map/coordinates';
import { mcp, pour as pourCopy } from '../copy';
import { readFollowedPalates, type FollowedOverlap } from '../atproto/follows-overlap';
import { cleanDraft } from '../pours/pour-draft';
import { matchDrink, normalizeName } from '../drinks/search';
import { hedonicToRating } from '../pours/pour-entry';
import type { LogDrinkOptions } from '../api-client';
import type { PourRecord } from '../atproto/records';
import { palateOf, round, type ToolContext, type ToolResult } from './tool-helpers';

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
    const key = normalizeName(raw);
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
 * Log a pour as the member, through the same `logPour` the form uses.
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
