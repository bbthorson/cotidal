import type { Palate } from './atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

export interface ArchetypeDefinition {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  keyTraits: string[];
  /**
   * Names here must exist in `drinkDatabase` — this is a view onto the map,
   * not a second list of drinks. `tests/drink-content.spec.ts` enforces it;
   * six of these had already drifted out of the database when it was added.
   */
  recommendedDrinks: string[];
  colorHex: string;
}

export const PALATE_ARCHETYPES: Record<string, ArchetypeDefinition> = {
  'spirit-purist': {
    id: 'spirit-purist',
    title: 'Spirit-Forward Purist',
    subtitle: 'Bold, Spirit-Driven & Minimalist',
    icon: '🍸',
    description: 'You appreciate the raw integrity of aged spirits, subtle oak tannins, and clean spirit expression without masking sweetness.',
    keyTraits: ['High Spirit-Forward', 'Low Sweetness', 'Oak & Botanicals'],
    recommendedDrinks: ['Oaxaca Old Fashioned', 'Sazerac', 'Manhattan', 'Vieux Carré'],
    colorHex: '#d4941a', // Warm Amber Gold
  },
  'bitter-connoisseur': {
    id: 'bitter-connoisseur',
    title: 'Bitter Connoisseur',
    subtitle: 'Aperitivo & Herbal Explorer',
    icon: '🌿',
    description: 'You gravitate toward complex botanical bitterness, amaro complexity, and herbal depth that awakens the senses.',
    keyTraits: ['High Bitterness', 'Botanical / Amaro', 'Complex Finish'],
    recommendedDrinks: ['Negroni', 'Boulevardier', 'Paper Plane', 'Toronto'],
    colorHex: '#b24c29', // Terracotta Burnished Red
  },
  'citrus-refreshing': {
    id: 'citrus-refreshing',
    title: 'Citrus & Refreshing',
    subtitle: 'Bright, Crisp & Acidic',
    icon: '🍋',
    description: 'You crave vibrant acidity, fresh citrus zests, and effervescent highballs that feel clean, crisp, and crushable.',
    keyTraits: ['High Citrus', 'Vibrant Sourness', 'Effervescent'],
    recommendedDrinks: ['Last Word', 'Daiquiri (Classic)', 'French 75', 'Aviation'],
    colorHex: '#4a90e2', // Crisp Azure
  },
  'agave-smoke': {
    id: 'agave-smoke',
    title: 'Agave & Smoke Explorer',
    subtitle: 'Earthy, Terroir & Smoky',
    icon: '🌵',
    description: 'You love artisanal mezcals, earthy agaves, and smoky peat notes paired with herbal complexity.',
    keyTraits: ['High Smoky / Earthy', 'Agave Centric', 'Spicy Accents'],
    recommendedDrinks: ['Naked & Famous', 'Mezcal Paloma', 'Division Bell', 'Oaxaca Old Fashioned'],
    colorHex: '#769f6f', // Sage Green
  },
  'velvet-sweet': {
    id: 'velvet-sweet',
    title: 'Velvet & Rich',
    subtitle: 'Indulgent, Silky & Creamy',
    icon: '🍯',
    description: 'You enjoy luxurious texture, rich coffee or dessert undertones, and velvety mouthfeel with balanced sweetness.',
    keyTraits: ['Rich Body', 'Pleasing Sweetness', 'Silky Texture'],
    recommendedDrinks: ['Espresso Martini', 'Amaretto Sour', 'Penicillin', 'Sidecar'],
    colorHex: '#9c64a6', // Deep Velvet
  },
  'balanced-alchemist': {
    id: 'balanced-alchemist',
    title: 'Balanced Alchemist',
    subtitle: 'Harmonious & Multi-Dimensional',
    icon: '🔮',
    description: 'Your palate spans multiple flavor quadrants smoothly, adapting with grace to sweet, sour, bitter, and spirit-forward profiles.',
    keyTraits: ['Versatile', 'Balanced Acids & Sugars', 'Curious Taste DNA'],
    recommendedDrinks: ['Paper Plane', 'Last Word', 'Corpse Reviver No. 2', 'Mai Tai'],
    colorHex: '#e5b85a', // Alchemist Gold
  },
};

/** A palate read as six 0–5 axes, for matching archetypes. Derived, never stored. */
export interface SensoryProfile {
  bitter: number;
  sweet: number;
  sour: number;
  spiritForward: number;
  citrus: number;
  herbal: number;
}

/**
 * Derives a 6-axis SensoryProfile (0-5 scale) from either Palate or UserProfile
 */
export function extractSensoryProfile(
  palate?: Palate | UserProfile | null
): SensoryProfile {
  if (!palate) {
    return { bitter: 2.5, sweet: 2.5, sour: 2.5, spiritForward: 2.5, citrus: 2.5, herbal: 2.5 };
  }

  // If Palate with dynamicState exists
  if ('dynamicState' in palate && palate.dynamicState) {
    const v = palate.dynamicState.latentVector;
    const crisp = v[0] ?? 0;
    const sweet = v[1] ?? 0;
    const bitterVal = v[2] ?? 5;
    const tanninVal = v[3] ?? 5;
    const compVal = v[4] ?? 5;
    return {
      bitter: Math.max(0, Math.min(5, bitterVal / 2)),
      sweet: Math.max(0, Math.min(5, 2.5 + sweet / 4)),
      sour: Math.max(0, Math.min(5, 2.5 + crisp / 4)),
      spiritForward: Math.max(0, Math.min(5, 2.5 - sweet / 4 + tanninVal / 10)),
      citrus: Math.max(0, Math.min(5, 2.5 + crisp / 4)),
      herbal: Math.max(0, Math.min(5, compVal / 2)),
    };
  }

  // Derived from x, y coordinates [-10, 10]
  const x = 'mapCoordinates' in palate ? palate.mapCoordinates.x : ('x' in palate ? palate.x : 0);
  const y = 'mapCoordinates' in palate ? palate.mapCoordinates.y : ('y' in palate ? palate.y : 0);
  const dislikesBitter = 'aversions' in palate ? palate.aversions.bitter : ('dislikesBitter' in palate ? palate.dislikesBitter : false);
  const dislikesSmoke = 'aversions' in palate ? palate.aversions.smoke : ('dislikesSmoke' in palate ? palate.dislikesSmoke : false);

  const sweet = Math.max(0, Math.min(5, 2.5 + y / 4));
  const sour = Math.max(0, Math.min(5, 2.5 + x / 4));
  const spiritForward = Math.max(0, Math.min(5, 2.5 - y / 4));
  const bitter = dislikesBitter ? 0.5 : Math.max(0, Math.min(5, 2.5 - x / 5));
  const citrus = Math.max(0, Math.min(5, 2.5 + x / 4));
  const herbal = dislikesSmoke ? 1.0 : Math.max(0, Math.min(5, 2.5 + Math.abs(x) / 5));

  return { bitter, sweet, sour, spiritForward, citrus, herbal };
}

/**
 * Calculates the dynamic archetype assignment based on 6-axis sensory profile
 */
export function calculatePalateArchetype(
  palate?: Palate | UserProfile | null
): ArchetypeDefinition {
  const profile = extractSensoryProfile(palate);

  const { bitter, sweet, sour, spiritForward, citrus, herbal } = profile;

  // Rule 1: Spirit-Forward Purist
  if (spiritForward >= 3.5 && sweet <= 2.2) {
    return PALATE_ARCHETYPES['spirit-purist'];
  }

  // Rule 2: Bitter Connoisseur
  if (bitter >= 3.2 || (herbal >= 3.5 && bitter >= 2.5)) {
    return PALATE_ARCHETYPES['bitter-connoisseur'];
  }

  // Rule 3: Agave & Smoke Explorer
  if (herbal >= 3.8 || (spiritForward >= 3.0 && herbal >= 3.0)) {
    return PALATE_ARCHETYPES['agave-smoke'];
  }

  // Rule 4: Citrus & Refreshing
  if (citrus >= 3.4 || (sour >= 3.4 && sweet <= 3.2)) {
    return PALATE_ARCHETYPES['citrus-refreshing'];
  }

  // Rule 5: Velvet & Sweet
  if (sweet >= 3.6) {
    return PALATE_ARCHETYPES['velvet-sweet'];
  }

  // Default: Balanced Alchemist
  return PALATE_ARCHETYPES['balanced-alchemist'];
}
