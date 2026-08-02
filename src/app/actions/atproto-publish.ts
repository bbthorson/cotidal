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
