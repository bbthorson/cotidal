import { publishPalateProfile, shareToFeed, getPalateProfile, publishRawPalateRecord, publishDrinkLog, getDrinkLogs } from '@/lib/atproto/publish';
import { derivePalateRecord, getDrinkSensoryVector } from '@/lib/sensory';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { z } from 'zod';
import { drinkDatabase } from '@/lib/data';
import type { PalateRecord, DrinkLogRecord } from '@/lib/atproto/lexicon';

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
});

function getDidFromCookie(): string | undefined {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )atproto_did=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }
  return undefined;
}

export async function publishPalate(profile: UserProfile): Promise<{ success: boolean; uri?: string; error?: string }> {
  const did = getDidFromCookie();
  if (!did) return { success: false, error: 'Not connected to Bluesky' };

  const parsed = ProfileSchema.safeParse(profile);
  if (!parsed.success) return { success: false, error: 'Invalid profile data' };

  try {
    const result = await publishPalateProfile(did, parsed.data as UserProfile);
    return { success: true, uri: result.uri };
  } catch (e) {
    console.error('Failed to publish palate:', e);
    return { success: false, error: 'Failed to publish profile' };
  }
}

export async function sharePalateToFeed(
  topDrink: string,
  quadrant: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  const did = getDidFromCookie();
  if (!did) return { success: false, error: 'Not connected to Bluesky' };

  if (!topDrink || topDrink.length > 100) return { success: false, error: 'Invalid drink name' };
  if (!quadrant || quadrant.length > 50) return { success: false, error: 'Invalid quadrant' };

  try {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crystalcoupe.app';
    const result = await shareToFeed(did, topDrink, quadrant, appUrl);
    return { success: true, uri: result.uri };
  } catch (e) {
    console.error('Failed to share to feed:', e);
    return { success: false, error: 'Failed to share to Bluesky' };
  }
}

export async function getConnectedPalate(): Promise<UserProfile | null> {
  const did = getDidFromCookie();
  if (!did) return null;

  try {
    const record = await getPalateProfile(did);
    if (!record) return null;

    return {
      x: record.mapCoordinates?.x ?? 0,
      y: record.mapCoordinates?.y ?? 0,
      dislikesSmoke: record.aversions?.smoke ?? false,
      dislikesBitter: record.aversions?.bitter ?? false,
      dislikesAnise: record.aversions?.anise ?? false,
      vibeTags: (record.vibeTags as Record<string, number>) || {},
    };
  } catch (e) {
    console.error('Failed to get connected palate:', e);
    return null;
  }
}

export interface LogDrinkOptions {
  drinkName: string;
  rating: number;
  baseSpirit?: string;
  isHomePour?: boolean;
  location?: string;
  venue?: { name: string; lat?: number; lng?: number };
  sensoryProfile?: {
    bitter: number;
    sweet: number;
    sour: number;
    spiritForward: number;
    citrus: number;
    herbal: number;
  };
  glassware?: string;
  garnish?: string;
  deviations?: string[];
  note?: string;
  crosspostToFeed?: boolean;
}

export async function logDrinkFeedback(
  drinkNameOrOptions: string | LogDrinkOptions,
  locationArg?: string,
  ratingArg?: number,
  deviationsArg?: string[],
  noteArg?: string
): Promise<{ success: boolean; profile?: UserProfile; uri?: string; error?: string }> {
  const did = getDidFromCookie();
  if (!did) return { success: false, error: 'Not connected to Bluesky' };

  let options: LogDrinkOptions;
  if (typeof drinkNameOrOptions === 'object') {
    options = drinkNameOrOptions;
  } else {
    options = {
      drinkName: drinkNameOrOptions,
      location: locationArg || '',
      rating: ratingArg ?? 5.0,
      deviations: deviationsArg || [],
      note: noteArg,
    };
  }

  const {
    drinkName,
    rating,
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

    let body = record.sensoryVector.textures.body;
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
        body = Math.max(0, body - 0.6);
      } else if (dev === 'too-crisp') {
        xShift -= 1.2;
        body = Math.min(10, body + 0.6);
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
      body += 0.15 * (drinkSensory.textures.body - body);
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
        textures: { body, effervescence }
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
        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crystalcoupe.app';
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

    return {
      success: true,
      profile: mappedProfile,
      uri: drinkLogRes.uri
    };
  } catch (e) {
    console.error('Failed to log drink feedback:', e);
    return { success: false, error: 'Failed to process feedback' };
  }
}

export async function getConnectedDrinkLogs(limit?: number): Promise<DrinkLogRecord[]> {
  const did = getDidFromCookie();
  if (!did) return [];

  try {
    return await getDrinkLogs(did, limit);
  } catch (e) {
    console.error('Failed to get connected drink logs:', e);
    return [];
  }
}
