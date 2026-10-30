import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { PourRecord, PerceivedIntensities, ElicitationRecord } from '@/lib/atproto/records';
import type { BaseSpirit, Glassware } from '@/lib/atproto/vocab';
import { apiErrors } from '@/lib/copy';
import { clearPendingAnswers, loadPendingAnswers, savePendingAnswers } from '@/lib/device-store';

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

/** Why a drink suits you; `null` when the request failed, so the page shows nothing rather than a stand-in. */
export async function explainDrinkMatch(drinkName: string, userProfile: unknown): Promise<string | null> {
  try {
    const res = await fetch('/api/explain-drink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkName, userProfile }),
    });

    const data = await res.json();
    return data.text || null;
  } catch (error) {
    console.error('Failed to explain drink match:', error);
    return null;
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
    return { success: false, error: apiErrors.publishFailed };
  }
}

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
  savePendingAnswers(record);
  return flushPendingElicitation(record);
}

/** Publish answers left waiting on this device, if any; clears them on success. */
export async function flushPendingElicitation(record?: ElicitationRecord): Promise<boolean> {
  const pending = record ?? loadPendingAnswers();
  if (!pending) return false;
  const ok = await postElicitation(pending);
  if (ok) clearPendingAnswers();
  return ok;
}

export async function sharePalateToFeed(
  topDrink: string,
  quadrant: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sharePalateToFeed', topDrink, quadrant }),
    });
    return await res.json();
  } catch {
    return { success: false, error: apiErrors.shareFailed };
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
  options: LogDrinkOptions
): Promise<{ success: boolean; profile?: UserProfile; uri?: string; error?: string }> {
  try {
    const res = await fetch('/api/atproto-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logDrinkFeedback', options }),
    });
    return await res.json();
  } catch {
    return { success: false, error: apiErrors.logFailed };
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
    return data.pours ?? [];
  } catch {
    return [];
  }
}
