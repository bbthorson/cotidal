import type { APIRoute } from 'astro';
import { publishPalateProfile, shareToFeed, getPalateProfile, publishRawPalateRecord, publishDrinkLog, getDrinkLogs } from '@/lib/atproto/publish';
import { derivePalateRecord, getDrinkSensoryVector } from '@/lib/sensory';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { z } from 'zod';
import { drinkDatabase } from '@/lib/data';
import type { PalateRecord, DrinkLogRecord } from '@/lib/atproto/lexicon';
import type { LogDrinkOptions } from '@/lib/api-client';

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
});

function getDidFromHeaderOrCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )atproto_did=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

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

  const did = getDidFromHeaderOrCookie(request);

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

  if (body.action === 'getConnectedDrinkLogs') {
    if (!did) return new Response(JSON.stringify({ logs: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const limit = typeof body.limit === 'number' ? body.limit : undefined;
      const logs = await getDrinkLogs(did, limit);
      return new Response(JSON.stringify({ logs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to get connected drink logs:', e);
      return new Response(JSON.stringify({ logs: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
      baseSpirit,
      isHomePour = false,
      location,
      venue,
      sensoryProfile,
      glassware,
      garnish,
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

      const currentX = record.mapCoordinates.x;
      const currentY = record.mapCoordinates.y;
      let xShift = 0;
      let yShift = 0;

      let sweet = record.sensoryVector.tastes.sweet;
      let sour = record.sensoryVector.tastes.sour;
      let bitter = record.sensoryVector.tastes.bitter;
      let umami = record.sensoryVector.tastes.umami;
      
      let smoky = record.sensoryVector.aromas.smoky;
      let herbaceous = record.sensoryVector.aromas.herbaceous;
      let spicy = record.sensoryVector.aromas.spicy;
      let fruity = record.sensoryVector.aromas.fruity;
      let floral = record.sensoryVector.aromas.floral;

      let bodyVal = record.sensoryVector.textures.body;
      let effervescence = record.sensoryVector.textures.effervescence;

      let smokeAversion = record.aversions.smoke;
      let bitterAversion = record.aversions.bitter;
      let aniseAversion = record.aversions.anise;

      if (sensoryProfile) {
        bitter = Math.max(0, Math.min(10, (bitter + sensoryProfile.bitter * 2) / 2));
        sweet = Math.max(0, Math.min(10, (sweet + sensoryProfile.sweet * 2) / 2));
        sour = Math.max(0, Math.min(10, (sour + sensoryProfile.sour * 2) / 2));
        herbaceous = Math.max(0, Math.min(10, (herbaceous + sensoryProfile.herbal * 2) / 2));
      }

      for (const dev of deviations) {
        if (dev === 'too-sweet') {
          yShift -= 1.2;
          sweet = Math.max(0, sweet - 0.6);
        } else if (dev === 'not-sweet-enough') {
          yShift += 1.2;
          sweet = Math.min(10, sweet + 0.6);
        } else if (dev === 'too-sour') {
          xShift += 0.6;
          sour = Math.max(0, sour - 0.6);
        } else if (dev === 'not-sour-enough') {
          xShift -= 0.6;
          sour = Math.min(10, sour + 0.6);
        } else if (dev === 'too-bitter') {
          bitterAversion = true;
          bitter = Math.max(0, bitter - 1.5);
        } else if (dev === 'too-smoky') {
          smokeAversion = true;
          smoky = Math.max(0, smoky - 1.5);
        } else if (dev === 'too-anise') {
          aniseAversion = true;
          herbaceous = Math.max(0, herbaceous - 1.5);
        } else if (dev === 'too-rich') {
          xShift += 1.2;
          bodyVal = Math.max(0, bodyVal - 0.6);
        } else if (dev === 'too-crisp') {
          xShift -= 1.2;
          bodyVal = Math.min(10, bodyVal + 0.6);
        } else if (dev === 'too-flat') {
          effervescence = Math.min(10, effervescence + 0.8);
        } else if (dev === 'too-fizzy') {
          effervescence = Math.max(0, effervescence - 0.8);
        }
      }

      const drink = drinkDatabase.find(d => d.name.toLowerCase() === drinkName.toLowerCase());
      if (drink && rating >= 7.0) {
        xShift += 0.15 * (drink.x - currentX);
        yShift += 0.15 * (drink.y - currentY);

        const drinkSensory = getDrinkSensoryVector(drink);
        sweet += 0.15 * (drinkSensory.tastes.sweet - sweet);
        sour += 0.15 * (drinkSensory.tastes.sour - sour);
        bitter += 0.15 * (drinkSensory.tastes.bitter - bitter);
        umami += 0.15 * (drinkSensory.tastes.umami - umami);
        smoky += 0.15 * (drinkSensory.aromas.smoky - smoky);
        herbaceous += 0.15 * (drinkSensory.aromas.herbaceous - herbaceous);
        spicy += 0.15 * (drinkSensory.aromas.spicy - spicy);
        fruity += 0.15 * (drinkSensory.aromas.fruity - fruity);
        floral += 0.15 * (drinkSensory.aromas.floral - floral);
        bodyVal += 0.15 * (drinkSensory.textures.body - bodyVal);
        effervescence += 0.15 * (drinkSensory.textures.effervescence - effervescence);

        const updatedVibeTags = { ...(record.vibeTags as Record<string, number> || {}) };
        drink.tags.forEach(tag => {
          updatedVibeTags[tag] = Math.min(5.0, (updatedVibeTags[tag] || 0) + 0.25);
        });
        record.vibeTags = updatedVibeTags;
      }

      const finalX = Math.max(-10, Math.min(10, currentX + xShift));
      const finalY = Math.max(-10, Math.min(10, currentY + yShift));

      const updatedPalate: PalateRecord = {
        $type: record.$type,
        mapCoordinates: { x: finalX, y: finalY },
        sensoryVector: {
          tastes: { sweet, sour, salty: 2.0, bitter, umami },
          aromas: { smoky, herbaceous, spicy, fruity, floral },
          textures: { body: bodyVal, effervescence }
        },
        aversions: {
          smoke: smokeAversion,
          bitter: bitterAversion,
          anise: aniseAversion
        },
        vibeTags: record.vibeTags,
        createdAt: record.createdAt,
        updatedAt: new Date().toISOString()
      };

      await publishRawPalateRecord(did, updatedPalate);

      const drinkLogRes = await publishDrinkLog(did, {
        drinkName,
        rating,
        baseSpirit,
        isHomePour,
        location: finalLocation,
        venue: venue || (location ? { name: location } : undefined),
        sensoryProfile,
        glassware,
        garnish,
        hedonicScale,
        deviations: deviations as DrinkLogRecord['deviations'],
        notes: note || '',
        note: note || '',
        palateShift: {
          x: finalX - currentX,
          y: finalY - currentY
        },
        createdAt: new Date().toISOString()
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
        x: finalX,
        y: finalY,
        dislikesSmoke: smokeAversion,
        dislikesBitter: bitterAversion,
        dislikesAnise: aniseAversion,
        vibeTags: updatedPalate.vibeTags as Record<string, number>
      };

      return new Response(JSON.stringify({
        success: true,
        profile: mappedProfile,
        uri: drinkLogRes.uri
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to log drink feedback:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to process feedback' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
