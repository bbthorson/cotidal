import { waitingPick } from '@/lib/copy';
import type { DrinkPick } from '@/lib/device-store';
import { cleanDraft, type PourDraft } from '@/lib/pours/pour-draft';
import type { PourEntry } from '@/lib/pours/pour-entry';

/** Picks older than ~12 hours ask in the past tense and offer Set it aside. */
export const STALE_PICK_HOURS = 12;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Hedonic score logged by a one-tap "Another" reorder (strong positive evidence). */
export const REORDER_HEDONIC = 8;

export interface PickAge {
  stale: boolean;
  label: string;
}

/**
 * How long ago a pick was kept, and whether it has crossed the ~12-hour mark
 * where memory is weaker and the strip asks in the past tense.
 */
export function pickAge(pickedAt: string | undefined, now = Date.now()): PickAge | null {
  if (!pickedAt) return null;
  const then = Date.parse(pickedAt);
  if (!Number.isFinite(then)) return null;
  const elapsed = Math.max(0, now - then);
  const stale = elapsed >= STALE_PICK_HOURS * HOUR_MS;
  if (stale) {
    const hours = Math.floor(elapsed / HOUR_MS);
    const days = Math.floor(hours / 24);
    return {
      stale: true,
      label: hours < 36 ? waitingPick.lastNight : waitingPick.pickedDays(days),
    };
  }
  const mins = Math.floor(elapsed / MINUTE_MS);
  if (mins < 2) return { stale: false, label: waitingPick.justPicked };
  if (mins < 60) return { stale: false, label: waitingPick.pickedMinutes(mins) };
  return { stale: false, label: waitingPick.pickedHours(Math.floor(mins / 60)) };
}

/** Turn a waiting pick into a PourDraft (carrying bar + geo point, with no rating). */
export function draftFromPick(pick: DrinkPick): PourDraft | null {
  return cleanDraft({
    drink: pick.drink,
    atHome: pick.atHome,
    bar: pick.bar,
    lat: pick.at?.lat,
    lon: pick.at?.lon,
  });
}

/** Turn a waiting pick + one-tap rating into a PourEntry for useRatePour. */
export function entryFromPick(pick: DrinkPick, hedonic: number, wouldOrderAgain?: boolean): PourEntry {
  const isHomePour = !!pick.atHome || !pick.bar;
  return {
    drinkName: pick.drink,
    hedonic,
    isHomePour,
    venue: isHomePour ? '' : (pick.bar ?? ''),
    deviations: [],
    note: '',
    crosspost: false,
    ...(wouldOrderAgain !== undefined ? { wouldOrderAgain } : {}),
  };
}
