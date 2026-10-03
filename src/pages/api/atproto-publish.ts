import type { APIRoute } from 'astro';
import {
  publishPalateProfile,
  shareToFeed,
  getPalateProfile,
  publishRawPalateRecord,
  publishPour,
  getPours,
} from '@/lib/atproto/publish';
import { derivePalateRecord } from '@/lib/sensory';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { z } from 'zod';
import { drinkDatabase } from '@/lib/data';
import type { PalateRecord } from '@/lib/atproto/records';
import type { LogDrinkOptions } from '@/lib/api-client';
import { didFromRequest } from '@/lib/atproto/session';
import {
  fromDynamicRecord,
  toDynamicRecord,
  applyPour,
  projectTo2D,
  createInitialPalateState,
  type TastingObservation,
} from '@/lib/palate-state';

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
});

export const POST: APIRoute = async ({ request }) => {
  let body: { action?: string; [key: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const did = didFromRequest(request);

  if (body.action === 'getConnectedPalate') {
    if (!did) return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const record = await getPalateProfile(did);
      if (!record) return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      const profile: UserProfile = {
        x: record.mapCoordinates?.x ?? 0,
        y: record.mapCoordinates?.y ?? 0,
        dislikesSmoke: record.aversions?.smoke ?? false,
        dislikesBitter: record.aversions?.bitter ?? false,
        dislikesAnise: record.aversions?.anise ?? false,
        vibeTags: (record.vibeTags as Record<string, number>) || {},
      };
      return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to get connected palate:', e);
      return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'getConnectedDrinkLogs' || body.action === 'getConnectedPours') {
    if (!did) return new Response(JSON.stringify({ logs: [], pours: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const limit = typeof body.limit === 'number' ? body.limit : undefined;
      const pours = await getPours(did, limit);
      return new Response(JSON.stringify({ pours, logs: pours }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to get connected pours:', e);
      return new Response(JSON.stringify({ pours: [], logs: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (!did) {
    return new Response(JSON.stringify({ success: false, error: 'Not connected to Bluesky' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'publishPalate') {
    const parsed = ProfileSchema.safeParse(body.profile);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: 'Invalid profile data' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    try {
      const result = await publishPalateProfile(did, parsed.data as UserProfile);
      return new Response(JSON.stringify({ success: true, uri: result.uri }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to publish palate:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to publish profile' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'sharePalateToFeed') {
    const topDrink = body.topDrink as string;
    const quadrant = body.quadrant as string;
    const appUrl = (body.appUrl as string) || 'https://crystalcoupe.app';

    if (!topDrink || topDrink.length > 100) return new Response(JSON.stringify({ success: false, error: 'Invalid drink name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (!quadrant || quadrant.length > 50) return new Response(JSON.stringify({ success: false, error: 'Invalid quadrant' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    try {
      const result = await shareToFeed(did, topDrink, quadrant, appUrl);
      return new Response(JSON.stringify({ success: true, uri: result.uri }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to share to feed:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to share to Bluesky' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'logDrinkFeedback') {
    // Request body: every field is unvalidated, hence Partial. The guard
    // below plus the defaults in the destructure are what make it safe.
    const options = body.options as Partial<LogDrinkOptions> | undefined;
    if (!options || typeof options !== 'object') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid options' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // `drinkName` was previously read through an `as any` and used unguarded
    // in three places, so a request without one wrote a record with an
    // undefined name rather than being rejected here.
    if (typeof options.drinkName !== 'string' || !options.drinkName.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'drinkName is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const {
      drinkName,
      rating = 5.0,
      baseSpirit: _baseSpirit,
      isHomePour = false,
      location,
      venue,
      sensoryProfile: _sensoryProfile,
      glassware: _glassware,
      garnish: _garnish,
      deviations = [],
      note,
      crosspostToFeed = false,
    } = options;

    const hedonicScale = Math.max(1, Math.min(9, Math.round(rating * 0.8 + 1)));
    const finalLocation = isHomePour ? 'Home Pour' : (venue?.name || location || 'Unknown Venue');

    try {
      let record = await getPalateProfile(did);
      if (!record) {
        const dummyProfile: UserProfile = { x: 0, y: 0, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
        record = derivePalateRecord(dummyProfile, null);
      }

      const priorState = record.dynamicState
        ? fromDynamicRecord(record.dynamicState)
        : createInitialPalateState({
            x: record.mapCoordinates.x,
            y: record.mapCoordinates.y,
            dislikesBitter: record.aversions.bitter,
          });

      const drink = drinkDatabase.find(d => d.name.toLowerCase() === drinkName.toLowerCase());

      const observation: TastingObservation = {
        hedonic: hedonicScale,
        glmsValence: options.glmsValence,
        perceivedIntensities: options.perceivedIntensities,
        cata: options.cata,
        context: options.context,
      };

      const nextState = applyPour(priorState, drink, observation, deviations);
      const coords = projectTo2D(nextState);

      const updatedVibeTags = { ...(record.vibeTags as Record<string, number> || {}) };
      if (hedonicScale >= 7 && drink) {
        drink.tags.forEach(tag => {
          updatedVibeTags[tag] = Math.min(5.0, (updatedVibeTags[tag] || 0) + 0.25);
        });
      }

      // "Too bitter", "too smoky" and "too anise" are aversions, not directions.
      const aversions = {
        smoke: record.aversions.smoke || deviations.includes('too-smoky'),
        bitter: record.aversions.bitter || deviations.includes('too-bitter'),
        anise: record.aversions.anise || deviations.includes('too-anise'),
      };

      const updatedPalate: PalateRecord = {
        $type: record.$type,
        mapCoordinates: { x: coords.x, y: coords.y },
        dynamicState: toDynamicRecord(nextState),
        phenotypes: record.phenotypes || {
          tas2r38BitterSensitivity: record.aversions.bitter ? 'super-taster' : 'medium-taster',
          trigeminalTolerance: 'moderate',
        },
        aversions,
        vibeTags: updatedVibeTags,
        createdAt: record.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await publishRawPalateRecord(did, updatedPalate);

      const pourRes = await publishPour(did, {
        drink: {
          name: drinkName,
          slug: drink?.name ? drink.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined,
        },
        venue: isHomePour
          ? undefined
          : {
              entity: {
                name: venue?.name || location || 'Unknown Venue',
              },
            },
        rating: {
          hedonic: hedonicScale,
          glmsValence: options.glmsValence,
          wouldOrderAgain: options.wouldOrderAgain ?? (rating >= 7.0),
        },
        perceivedIntensities: options.perceivedIntensities,
        deviations: deviations.length > 0 ? deviations : undefined,
        cata: options.cata && options.cata.length > 0 ? options.cata : undefined,
        context: options.context,
        note: note ? note.slice(0, 3000) : undefined,
        isHomePour: !!isHomePour,
        createdAt: new Date().toISOString(),
      });

      if (crosspostToFeed) {
        try {
          const appUrl = (body.appUrl as string) || 'https://crystalcoupe.app';
          const stars = '★'.repeat(Math.round(rating / 2)) + '☆'.repeat(5 - Math.round(rating / 2));
          const postText = `Logged a ${rating.toFixed(1)}/10 ${drinkName} ${isHomePour ? '(Home Pour)' : `at ${finalLocation}`} on Crystal Coupe ${stars}`;
          await shareToFeed(did, drinkName, postText, appUrl);
        } catch (e) {
          console.error('Failed to crosspost to feed:', e);
        }
      }

      const mappedProfile: UserProfile = {
        x: coords.x,
        y: coords.y,
        dislikesSmoke: aversions.smoke,
        dislikesBitter: aversions.bitter,
        dislikesAnise: aversions.anise,
        vibeTags: updatedVibeTags,
      };

      return new Response(JSON.stringify({
        success: true,
        profile: mappedProfile,
        uri: pourRes.uri
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to log drink feedback:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to process feedback' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
