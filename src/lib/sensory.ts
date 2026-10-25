import type { Drink } from '@/lib/data';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { PALATE_COLLECTION, type Palate } from './atproto/records';
import { createInitialPalateState, toDynamicRecord } from './palate-state';

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

export function derivePalateRecord(profile: UserProfile, existing?: Palate | null): Palate {
  const now = new Date().toISOString();
  
  const dynamicState = existing?.dynamicState ?? toDynamicRecord(
    createInitialPalateState({
      x: profile.x,
      y: profile.y,
      dislikesBitter: profile.dislikesBitter,
      dislikesSmoke: profile.dislikesSmoke,
      dislikesAnise: profile.dislikesAnise,
      variance: profile.variance,
    })
  );

  const phenotypes = existing?.phenotypes ?? {
    tas2r38BitterSensitivity: profile.dislikesBitter ? 'super-taster' : 'medium-taster',
    trigeminalTolerance: 'moderate',
  };

  return {
    $type: PALATE_COLLECTION,
    mapCoordinates: {
      x: profile.x,
      y: profile.y,
    },
    dynamicState,
    phenotypes,
    aversions: {
      smoke: profile.dislikesSmoke,
      bitter: profile.dislikesBitter,
      anise: profile.dislikesAnise,
    },
    vibeTags: profile.vibeTags,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}
