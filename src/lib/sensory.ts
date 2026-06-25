import type { Drink } from '@/lib/data';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { PALATE_COLLECTION, type PalateRecord } from './atproto/lexicon';

export interface SensoryVector {
  tastes: {
    sweet: number;
    sour: number;
    salty: number;
    bitter: number;
    umami: number;
  };
  aromas: {
    smoky: number;
    herbaceous: number;
    spicy: number;
    fruity: number;
    floral: number;
  };
  textures: {
    body: number;
    effervescence: number;
  };
}

// Helper to map drink info to sensory science vector
export function getDrinkSensoryVector(drink: Drink): SensoryVector {
  const bitter = drink.isBitter ? 7.0 : 2.0;
  const smoky = drink.hasSmoke ? 8.0 : 0.0;
  const herbaceous = drink.hasAnise ? 8.0 : 0.0;

  const sweet = Math.max(1.0, Math.min(10.0, 5.0 + drink.y / 2));
  const umami = Math.max(1.0, Math.min(10.0, 5.0 - drink.y / 2));
  const sour = Math.max(1.0, Math.min(10.0, 5.0 + drink.x / 2));
  const salty = 2.0;

  const fruity = drink.tags.includes('sweet') || drink.tags.includes('crushable') ? 7.0 : 3.0;
  const floral = drink.tags.includes('visual') || drink.tags.includes('classic') ? 5.0 : 2.0;
  const spicy = drink.tags.includes('spice') || drink.tags.includes('warm') ? 8.0 : 2.0;

  const body = Math.max(1.0, Math.min(10.0, 5.0 - drink.x / 2));
  const effervescence = drink.x > 3 && drink.tags.includes('crushable') ? 7.0 : 2.0;

  return {
    tastes: { sweet, sour, salty, bitter, umami },
    aromas: { smoky, herbaceous, spicy, fruity, floral },
    textures: { body, effervescence }
  };
}

export function derivePalateRecord(profile: UserProfile, existing?: PalateRecord | null): PalateRecord {
  const now = new Date().toISOString();
  
  if (existing && existing.sensoryVector) {
    return {
      $type: PALATE_COLLECTION,
      mapCoordinates: {
        x: profile.x,
        y: profile.y,
      },
      sensoryVector: existing.sensoryVector,
      aversions: {
        smoke: profile.dislikesSmoke,
        bitter: profile.dislikesBitter,
        anise: profile.dislikesAnise,
      },
      vibeTags: profile.vibeTags,
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };
  }

  return {
    $type: PALATE_COLLECTION,
    mapCoordinates: {
      x: profile.x,
      y: profile.y,
    },
    sensoryVector: {
      tastes: {
        sweet: Math.max(0, Math.min(10, 5 + profile.y / 2)),
        sour: Math.max(0, Math.min(10, 5 + profile.x / 2)),
        salty: 2.0,
        bitter: profile.dislikesBitter ? 0.0 : 4.0,
        umami: Math.max(0, Math.min(10, 5 - profile.y / 2)),
      },
      aromas: {
        smoky: profile.dislikesSmoke ? 0.0 : 3.0,
        herbaceous: profile.dislikesAnise ? 0.0 : 3.0,
        spicy: 3.0,
        fruity: Math.max(0, Math.min(10, 5 + profile.y / 2)),
        floral: Math.max(0, Math.min(10, 5 + profile.x / 2)),
      },
      textures: {
        body: Math.max(0, Math.min(10, 5 - profile.x / 2)),
        effervescence: Math.max(0, Math.min(10, 5 + profile.x / 2)),
      }
    },
    aversions: {
      smoke: profile.dislikesSmoke,
      bitter: profile.dislikesBitter,
      anise: profile.dislikesAnise,
    },
    vibeTags: profile.vibeTags,
    createdAt: now,
    updatedAt: now,
  };
}
