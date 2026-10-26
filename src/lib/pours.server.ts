import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { LogDrinkOptions } from '@/lib/api-client';
import { drinkDatabase, type Drink } from '@/lib/data';
import { catalogSlug, type Register } from '@/lib/register';
import { derivePalateRecord } from '@/lib/sensory';
import {
  PourWriteSchema,
  POUR_COLLECTION,
  POUR_NOTE_LIMITS,
  cataId,
  fitString,
  type Palate,
  type PourRecord,
} from '@/lib/atproto/records';
import { getPalateProfile, publishPour, publishRawPalateRecord, shareToFeed } from '@/lib/atproto/publish';
import {
  fromDynamicRecord,
  toDynamicRecord,
  applyPour,
  aversionsAfterPour,
  vibeTagsAfterPour,
  projectTo2D,
  createInitialPalateState,
  type TastingObservation,
} from '@/lib/palate-state';

/**
 * Logging a pour: the one pipeline, whoever is asking.
 *
 * `/api/atproto-publish` calls it for the page; the MCP server will call it
 * for a chat assistant (docs/mcp.md). Two copies of this would drift, and the
 * drift would be in what gets signed into someone's repository.
 *
 * Three steps, so the first two can be tested without a PDS:
 * - `buildPour` checks the request and builds the record against its lexicon.
 * - `palateAfterPour` moves the palate by it.
 * - `logPour` writes both, through a `PourStore`.
 */

/** The record and what the palate update needs from it. */
export interface BuiltPour {
  record: PourRecord;
  /** The 1–9 hedonic point the rating was mapped to. */
  hedonic: number;
  drink: Drink | undefined;
  deviations: string[];
  /** Where it was drunk, as the cross-post names it. */
  location: string;
}

export type BuildResult = { ok: true; pour: BuiltPour } | { ok: false; error: string };

/**
 * The request body as a pour, or why not. Every field is unvalidated, hence
 * `Partial`. Free text is cut to fit rather than refused; anything else that
 * does not fit its lexicon is refused, before anything is written.
 */
export function buildPour(
  options: Partial<LogDrinkOptions> | undefined,
  register: Register,
  now: Date = new Date()
): BuildResult {
  if (!options || typeof options !== 'object') return { ok: false, error: 'Invalid options' };

  // `drinkName` was previously read through an `as any` and used unguarded
  // in three places, so a request without one wrote a record with an
  // undefined name rather than being rejected here.
  if (typeof options.drinkName !== 'string' || !options.drinkName.trim()) {
    return { ok: false, error: 'drinkName is required' };
  }

  const {
    drinkName,
    rating = 5.0,
    baseSpirit,
    isHomePour = false,
    location,
    venue,
    glassware,
    garnish,
    deviations = [],
    note,
  } = options;

  const hedonic = Math.max(1, Math.min(9, Math.round(rating * 0.8 + 1)));
  const finalLocation = isHomePour ? 'Home Pour' : (venue?.name || location || 'Unknown Venue');
  const drink = drinkDatabase.find((d) => d.name.toLowerCase() === drinkName.toLowerCase());

  // Notes arrive as labels from a page loaded before CATA ids existed.
  const name = (s: string) => fitString(s, 200, 100);
  const check = PourWriteSchema.safeParse({
    $type: POUR_COLLECTION,
    drink: {
      name: name(drinkName),
      slug: catalogSlug(register, drinkName),
      baseSpirit,
    },
    venue: isHomePour ? undefined : { entity: { name: name(finalLocation) } },
    rating: {
      hedonic,
      glmsValence: options.glmsValence,
      // Recorded only when the drinker was asked: a guess from the rating is not their answer.
      wouldOrderAgain: options.wouldOrderAgain,
    },
    perceivedIntensities: options.perceivedIntensities,
    deviations: deviations.length > 0 ? deviations : undefined,
    cata: options.cata && options.cata.length > 0 ? options.cata.map(cataId) : undefined,
    glassware,
    garnish: garnish?.trim() ? fitString(garnish.trim(), 200) : undefined,
    note: note ? fitString(note, POUR_NOTE_LIMITS.maxLength, POUR_NOTE_LIMITS.maxGraphemes) : undefined,
    isHomePour: !!isHomePour,
    createdAt: now.toISOString(),
  });
  if (!check.success) return { ok: false, error: 'Invalid pour' };

  return { ok: true, pour: { record: check.data, hedonic, drink, deviations, location: finalLocation } };
}

/** The palate a pour leaves behind. `prior` is `null` for someone with no palate yet. */
export function palateAfterPour(prior: Palate | null, pour: BuiltPour, now: Date = new Date()): Palate {
  const record =
    prior ??
    derivePalateRecord(
      { x: 0, y: 0, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} },
      null
    );

  const priorState = record.dynamicState
    ? fromDynamicRecord(record.dynamicState)
    : createInitialPalateState({
        x: record.mapCoordinates.x,
        y: record.mapCoordinates.y,
        dislikesBitter: record.aversions.bitter,
        dislikesSmoke: record.aversions.smoke,
        dislikesAnise: record.aversions.anise,
      });

  const observation: TastingObservation = {
    hedonic: pour.hedonic,
    glmsValence: pour.record.rating.glmsValence,
    perceivedIntensities: pour.record.perceivedIntensities,
    cata: pour.record.cata,
  };

  const nextState = applyPour(priorState, pour.drink, observation, pour.deviations);
  const coords = projectTo2D(nextState);

  return {
    $type: record.$type,
    mapCoordinates: { x: coords.x, y: coords.y },
    dynamicState: toDynamicRecord(nextState),
    aversions: aversionsAfterPour(record.aversions, pour.deviations),
    vibeTags: vibeTagsAfterPour((record.vibeTags as Record<string, number>) || {}, pour.drink, pour.hedonic),
    createdAt: record.createdAt,
    updatedAt: now.toISOString(),
  };
}

/** The member's repository, as far as logging a pour needs it. */
export interface PourStore {
  readPalate(): Promise<Palate | null>;
  writePalate(palate: Palate): Promise<unknown>;
  writePour(pour: PourRecord): Promise<{ uri: string }>;
  /** A post on the member's feed; `appUrl` is the link it carries. */
  share(drinkName: string, text: string, appUrl: string): Promise<unknown>;
}

export function sessionStore(session: OAuthSession): PourStore {
  return {
    readPalate: () => getPalateProfile(session),
    writePalate: (palate) => publishRawPalateRecord(session, palate),
    writePour: (pour) => publishPour(session, pour),
    share: (drinkName, text, appUrl) => shareToFeed(session, drinkName, text, appUrl),
  };
}

export type LogPourResult =
  | { ok: true; profile: UserProfile; uri: string }
  | { ok: false; status: 400 | 500; error: string };

/**
 * Check, move, write. The pour is built and checked before anything is
 * written: the palate is written first, and a pour refused after it would
 * leave the map moved by a drink that was never logged.
 */
export async function logPour(
  store: PourStore,
  options: Partial<LogDrinkOptions> | undefined,
  context: { register: Register; appUrl: string }
): Promise<LogPourResult> {
  const built = buildPour(options, context.register);
  if (!built.ok) return { ok: false, status: 400, error: built.error };
  const { pour } = built;

  try {
    const palate = palateAfterPour(await store.readPalate(), pour);
    await store.writePalate(palate);
    const written = await store.writePour(pour.record);

    // `buildPour` has checked `drinkName`; the rest is as sent.
    const { drinkName, rating = 5.0, isHomePour, crosspostToFeed } = options as LogDrinkOptions;
    if (crosspostToFeed) {
      try {
        const stars = '★'.repeat(Math.round(rating / 2)) + '☆'.repeat(5 - Math.round(rating / 2));
        const postText = `Logged a ${rating.toFixed(1)}/10 ${drinkName} ${isHomePour ? '(Home Pour)' : `at ${pour.location}`} on Cotidal ${stars}`;
        await store.share(drinkName, postText, context.appUrl);
      } catch (e) {
        console.error('Failed to crosspost to feed:', e);
      }
    }

    return {
      ok: true,
      uri: written.uri,
      profile: {
        x: palate.mapCoordinates.x,
        y: palate.mapCoordinates.y,
        dislikesSmoke: palate.aversions.smoke,
        dislikesBitter: palate.aversions.bitter,
        dislikesAnise: palate.aversions.anise,
        vibeTags: palate.vibeTags as Record<string, number>,
      },
    };
  } catch (e) {
    console.error('Failed to log drink feedback:', e);
    return { ok: false, status: 500, error: 'Failed to process feedback' };
  }
}
