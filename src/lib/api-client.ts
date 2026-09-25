import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { DrinkLogRecord } from '@/lib/atproto/lexicon';

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

export async function explainDrinkMatch(drinkName: string, userProfile: unknown): Promise<string> {
  try {
    const res = await fetch('/api/explain-drink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkName, userProfile }),
    });

    const data = await res.json();
    return data.text || "This drink is an excellent choice for your palate.";
  } catch (error) {
    console.error("Failed to explain drink match:", error);
    return "This drink is an excellent choice for your palate.";
  }
}

export async function archetypeDrink(drinkName: string, description?: string) {
  try {
    const res = await fetch('/api/archetype-drink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkName, description }),
    });
    return await res.json();
  } catch (error) {
    console.error("Failed to archetype drink:", error);
    return {
      x: 0,
      y: 0,
      hasSmoke: false,
      hasAnise: false,
      isBitter: false,
      tags: ['classic'],
      oracleReasoning: "Couldn't get a full read on this one, but it's a classic."
    };
  }
}

export async function publishPalate(profile: UserProfile): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publishPalate', profile }),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Failed to publish profile' };
  }
}

export async function sharePalateToFeed(
  topDrink: string,
  quadrant: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crystalcoupe.app';
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sharePalateToFeed', topDrink, quadrant, appUrl }),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Failed to share to Bluesky' };
  }
}

export async function getConnectedPalate(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getConnectedPalate' }),
    });
    const data = await res.json();
    return data.profile ?? null;
  } catch {
    return null;
  }
}

export async function logDrinkFeedback(
  drinkNameOrOptions: string | LogDrinkOptions,
  locationArg?: string,
  ratingArg?: number,
  deviationsArg?: string[],
  noteArg?: string
): Promise<{ success: boolean; profile?: UserProfile; uri?: string; error?: string }> {
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

  try {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crystalcoupe.app';
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logDrinkFeedback', options, appUrl }),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Failed to process feedback' };
  }
}

export async function getConnectedDrinkLogs(limit?: number): Promise<DrinkLogRecord[]> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getConnectedDrinkLogs', limit }),
    });
    const data = await res.json();
    return data.logs ?? [];
  } catch {
    return [];
  }
}

export async function refinePalateWithAI(
  notes: string,
  currentProfile: UserProfile
): Promise<{ profile: UserProfile; dossier: string; generation?: string }> {
  try {
    const res = await fetch('/api/refine-palate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, currentProfile }),
    });
    const generation = res.headers.get('x-generation') || 'unavailable';
    const data = await res.json();
    return {
      profile: data.profile,
      dossier: data.dossier,
      generation,
    };
  } catch (error) {
    console.error('Failed to refine palate with AI:', error);
    return {
      profile: currentProfile,
      dossier: 'Your palate baseline remains anchored.',
      generation: 'unavailable',
    };
  }
}
