import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback } from '@/lib/api-client';
import { addGuestPour, clearPick, loadPick, savePick } from '@/lib/device-store';
import { pour } from '@/lib/copy';
import { catalogSlug } from '@/lib/drinks/register';
import { recentBarNames } from '@/lib/pours/pour-history';
import { userFromProfile, type UserProfile } from '@/lib/palate/profile';
import { guestShift } from '@/lib/palate/guest-palate';
import { closestDrinks } from '@/lib/drinks/search';
import { barPointFor, guestPourRecord, menuChange, toLogOptions, type PourEntry } from '@/lib/pours/pour-entry';
import type { PourDraft, RateRequest } from '@/lib/pours/pour-draft';
import type { TrackStart } from '@/lib/palate/track';
import { useMenu } from '@/hooks/useMenu';
import { clearRateRequestFromUrl } from '@/hooks/useRateSheet';

/** The pour just logged, and your menu as it stood before it, to show what it changed. */
export interface LastPour {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
  menuBefore: string[];
  /** Bar name if logged at a bar (not at home). */
  bar?: string;
  /** The open bar's ranked menu before this pour, when logged at that bar. */
  barMenuBefore?: string[];
  /** True when logged via "Another", keeping the waiting pick active. */
  keepPick?: boolean;
}

export interface SubmitPourOptions {
  /** Override draft (used by inline rating on a waiting pick to carry its bar geo point). */
  draft?: PourDraft;
  /** Keep the waiting pick for the next round ("Another"), refreshing its timestamp. */
  keepPick?: boolean;
}

/**
 * Rating one pour: the quick picks, the bar, and logging it — to the
 * member's repository, or on the device for a guest — then what it moved.
 * Used by both `RatePanel` (the full form) and `WaitingPick` (inline one-tap
 * rating), so every pour goes through one path.
 */
export function useRatePour({
  request,
  isMember,
  profile,
  setProfile,
  pours,
  start,
  reload,
  barMenuFor,
}: {
  request: RateRequest | null;
  isMember: boolean;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  pours: PourRecord[] | null;
  start: TrackStart | null;
  reload: () => Promise<void>;
  /** Snapshot of an open bar's ranked menu before logging a pour there. */
  barMenuFor?: (barName: string) => string[];
}) {
  const history = useMemo(() => pours ?? [], [pours]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState(request?.draft?.bar ?? '');
  // Kept until it is logged, then gone from state and the URL: the form
  // is replaced by the "moved" screen, and must not offer the same pour twice.
  const [draft, setDraft] = useState(request?.draft);
  const [lastPour, setLastPour] = useState<LastPour | null>(null);

  useEffect(() => {
    setVenue(request?.draft?.bar ?? '');
    setDraft(request?.draft);
    setError(null);
  }, [request]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { menu } = useMenu(user, profile?.vibeTags, history, start);

  // Quick picks: the drinks closest to where you are now.
  const nearest = useMemo(() => closestDrinks({ x, y }, 4).map((d) => d.name), [x, y]);
  const recentVenues = useMemo(() => recentBarNames(history), [history]);

  const submit = async (entry: PourEntry, opts?: SubmitPourOptions) => {
    const activeDraft = opts?.draft ?? draft;
    const at = barPointFor(entry, activeDraft);
    setSubmitting(true);
    setError(null);
    const from = { x, y };
    const menuBefore = menu.map((d) => d.name);
    const bar = !entry.isHomePour && entry.venue.trim() ? entry.venue.trim() : undefined;
    const barMenuBefore = bar && barMenuFor ? barMenuFor(bar) : undefined;
    try {
      if (isMember) {
        const options = toLogOptions(entry);
        if (at && options.venue) options.venue = { ...options.venue, lat: at.lat, lng: at.lon };
        const result = await logDrinkFeedback(options);
        if (!result.success || !result.profile) {
          setError(result.error || pour.failed);
          return;
        }
        setProfile(result.profile);
        await reload();
      } else {
        setProfile(guestShift(profile, entry));
        addGuestPour(
          guestPourRecord(entry, { slug: catalogSlug(entry.drinkName), at, createdAt: new Date().toISOString() })
        );
        await reload();
      }
      // A pick from the map, now rated: clear it unless "Another" keeps it for the next round.
      const existingPick = loadPick();
      if (existingPick && existingPick.drink.toLowerCase() === entry.drinkName.toLowerCase()) {
        if (opts?.keepPick) savePick({ ...existingPick, pickedAt: new Date().toISOString() });
        else clearPick();
      }
      if (draft) setDraft(undefined);
      // Rated: a reload must not offer the same pour again.
      clearRateRequestFromUrl();
      setLastPour({
        from,
        drinkName: entry.drinkName,
        hedonic: entry.hedonic,
        menuBefore,
        ...(bar ? { bar } : {}),
        ...(barMenuBefore && barMenuBefore.length > 0 ? { barMenuBefore } : {}),
        ...(opts?.keepPick ? { keepPick: true } : {}),
      });
    } catch (err) {
      console.error(err);
      setError(pour.failed);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = useCallback(() => {
    setLastPour(null);
    setError(null);
  }, []);

  // A stranger with no coordinate: the sheet says what this is, and the ways in.
  const cold = !profile && !isMember;

  return {
    cold,
    /** Logged: the form gives way to where the coordinate went. */
    reveal: !cold && !!lastPour,
    lastPour,
    to: { x, y },
    menuChange: lastPour
      ? menuChange(
          lastPour.menuBefore,
          menu.map((d) => d.name),
          lastPour.drinkName
        )
      : null,
    nearest,
    recentVenues,
    venue,
    setVenue,
    draft,
    submitting,
    error,
    submit,
    reset,
  };
}

export type RatePourState = ReturnType<typeof useRatePour>;
