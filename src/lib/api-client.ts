import type { UserProfile } from '@/lib/palate/profile';
import type { PourRecord, PerceivedIntensities, ElicitationRecord } from '@/lib/atproto/records';
import type { BaseSpirit, Glassware } from '@/lib/atproto/vocab';
import { apiErrors } from '@/lib/copy';
import { clearPendingAnswers, loadPendingAnswers, saveLastQuiz, savePendingAnswers } from '@/lib/device-store';

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

export interface MemberSnapshot {
  profile: UserProfile | null;
  pours: PourRecord[];
  quiz: ElicitationRecord | null;
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

/** A signed-in member's palate, recent pours, and latest quiz in one request. */
export async function getMemberSnapshot(limit = 50): Promise<MemberSnapshot> {
  try {
    const res = await fetch(`/api/me?limit=${limit}`);
    const data = await res.json();
    return {
      profile: data.profile ?? null,
      pours: Array.isArray(data.pours) ? data.pours : [],
      quiz: data.quiz ?? null,
    };
  } catch {
    return { profile: null, pours: [], quiz: null };
  }
}

export async function getConnectedPours(limit = 50): Promise<PourRecord[]> {
  try {
    const res = await fetch(`/api/me/pours?limit=${limit}`);
    const data = await res.json();
    return Array.isArray(data.pours) ? data.pours : [];
  } catch {
    return [];
  }
}

export async function publishPalate(profile: UserProfile): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const res = await fetch('/api/me/palate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    return await res.json();
  } catch {
    return { success: false, error: apiErrors.publishFailed };
  }
}

async function postElicitation(record: ElicitationRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/me/elicitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
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
  saveLastQuiz(record);
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

export async function logDrinkFeedback(
  options: LogDrinkOptions
): Promise<{ success: boolean; profile?: UserProfile; uri?: string; error?: string }> {
  try {
    const res = await fetch('/api/me/pours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return await res.json();
  } catch {
    return { success: false, error: apiErrors.logFailed };
  }
}

/** Fetch someone's public palate + tasting history for `/` overlays (`with=` / `table=`). */
export async function fetchPublicPalate(
  actor: string
): Promise<import('@/lib/atproto/public-read').PublicPalateResult> {
  try {
    const res = await fetch(`/api/palate?actor=${encodeURIComponent(actor)}`);
    return (await res.json()) as import('@/lib/atproto/public-read').PublicPalateResult;
  } catch {
    return { status: 'unavailable', actor: null };
  }
}

export interface CaptureMenuResponse {
  lines: string[];
  items: {
    label: string;
    description?: string;
    drinkName: string | null;
    directional?: {
      x: number;
      y: number;
      quadrant: string;
      confidence: 'low' | 'medium';
      aversions: { smoke: boolean; bitter: boolean; anise: boolean };
      closestClassicName: string | null;
    } | null;
  }[];
  method: 'photo' | 'manual';
  requiresSignIn?: boolean;
  outcome: string | null;
}

/** Capture a bar menu from a photo or pasted text via `/api/menu/capture`. */
export async function captureMenu(payload: {
  text?: string;
  image?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}): Promise<CaptureMenuResponse | null> {
  try {
    const res = await fetch('/api/menu/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      lines: Array.isArray(data.lines) ? data.lines : [],
      items: Array.isArray(data.items) ? data.items : [],
      method: data.method === 'photo' ? 'photo' : 'manual',
      requiresSignIn: !!data.requiresSignIn,
      outcome: res.headers.get('x-generation'),
    };
  } catch {
    return null;
  }
}
