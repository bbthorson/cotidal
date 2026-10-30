import { drinkDatabase } from '@/lib/data';
import {
  createInitialPalateState,
  applyPour,
  aversionsAfterPour,
  vibeTagsAfterPour,
  projectTo2D,
  fromDynamicRecord,
  toDynamicRecord,
} from '@/lib/palate-state';
import { loadGuestState, saveGuestState } from '@/lib/device-store';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { PourEntry } from '@/components/app/PourForm';

/** A coordinate at the origin, for someone who would rather try a pour first. */
export const neutralProfile: UserProfile = {
  x: 0,
  y: 0,
  dislikesSmoke: false,
  dislikesBitter: false,
  dislikesAnise: false,
  vibeTags: {},
};

/**
 * A guest's model state, kept on this device so steps shrink as pours
 * accumulate. It is only trusted while it still sits at the profile's
 * coordinate; retaking the quiz moves the profile and starts it afresh.
 */
function guestPrior(profile: UserProfile | null) {
  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const saved = loadGuestState();
  if (saved) {
    try {
      const state = fromDynamicRecord(saved);
      const at = projectTo2D(state);
      if (at.x === x && at.y === y) return state;
    } catch {
      // Unreadable: start fresh.
    }
  }
  return createInitialPalateState({
    x,
    y,
    dislikesBitter: profile?.dislikesBitter ?? false,
    dislikesSmoke: profile?.dislikesSmoke ?? false,
    dislikesAnise: profile?.dislikesAnise ?? false,
    variance: profile?.variance,
  });
}

/**
 * A guest's pour moves the coordinate on this device only, by the same
 * applyPour rules the server applies.
 */
export function guestShift(profile: UserProfile | null, entry: PourEntry): UserProfile {
  const drink = drinkDatabase.find((d) => d.name.toLowerCase() === entry.drinkName.toLowerCase());
  const next = applyPour(guestPrior(profile), drink, { hedonic: entry.hedonic, cata: entry.cata }, entry.deviations);
  const coords = projectTo2D(next);
  // Stored at the rounded coordinate so guestPrior recognises it next time.
  // If it is not kept, the coordinate still moves; only the shrinking step is lost.
  const record = toDynamicRecord(next);
  record.latentVector[0] = coords.x;
  record.latentVector[1] = coords.y;
  saveGuestState(record);

  const aversions = aversionsAfterPour(
    {
      smoke: profile?.dislikesSmoke ?? false,
      bitter: profile?.dislikesBitter ?? false,
      anise: profile?.dislikesAnise ?? false,
    },
    entry.deviations
  );

  return {
    x: coords.x,
    y: coords.y,
    dislikesSmoke: aversions.smoke,
    dislikesBitter: aversions.bitter,
    dislikesAnise: aversions.anise,
    vibeTags: vibeTagsAfterPour(profile?.vibeTags ?? {}, drink, entry.hedonic),
  };
}
