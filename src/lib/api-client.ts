import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { PourRecord, PerceivedIntensities, ElicitationRecord } from '@/lib/atproto/records';
import type { BaseSpirit, Glassware } from '@/lib/atproto/vocab';

export interface LogDrinkOptions {
  drinkName: string;
  rating: number;
  glmsValence?: number;
  baseSpirit?: BaseSpirit;
  isHomePour?: boolean;
  location?: string;
  venue?: { name: string; lat?: number; lng?: number };
  perceivedIntensities?: PerceivedIntensities;
  cata?: string[];
  glassware?: Glassware;
  garnish?: string;
  deviations?: string[];
  note?: string;
  /** Only when the drinker was asked; never inferred from the rating. */
  wouldOrderAgain?: boolean;
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

/** Where a finished quiz's answers wait until they reach the user's repository. */
const PENDING_ANSWERS_KEY = 'pending_elicitation';

async function postElicitation(record: ElicitationRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publishElicitation', record }),
    });
    return !!(await res.json())?.success;
  } catch {
    return false;
  }
}

/**
 * Log a finished quiz's answers. They are kept on this device until the
 * write succeeds, so a guest's answers follow them when they sign in
 * (`flushPendingElicitation`). Only the latest quiz waits; a retake as a
 * guest replaces it.
 */
export async function publishElicitation(record: ElicitationRecord): Promise<boolean> {
  try {
    localStorage.setItem(PENDING_ANSWERS_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable: try the write anyway.
  }
  return flushPendingElicitation(record);
}

/** Publish answers left waiting on this device, if any; clears them on success. */
export async function flushPendingElicitation(record?: ElicitationRecord): Promise<boolean> {
  let pending = record ?? null;
  if (!pending) {
    try {
      const raw = localStorage.getItem(PENDING_ANSWERS_KEY);
      pending = raw ? (JSON.parse(raw) as ElicitationRecord) : null;
    } catch {
      pending = null;
    }
  }
  if (!pending) return false;
  const ok = await postElicitation(pending);
  if (ok) {
    try {
      localStorage.removeItem(PENDING_ANSWERS_KEY);
    } catch {
      // Nothing to clear.
    }
  }
  return ok;
}

export async function sharePalateToFeed(
  topDrink: string,
  quadrant: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cotidal.app';
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
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cotidal.app';
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

export async function getConnectedPours(limit?: number): Promise<PourRecord[]> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getConnectedPours', limit }),
    });
    const data = await res.json();
    return data.pours ?? data.logs ?? [];
  } catch {
    return [];
  }
}

export const getConnectedDrinkLogs = getConnectedPours;

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
