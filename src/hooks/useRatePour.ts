import { useMemo, useState } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback } from '@/lib/api-client';
import { addGuestPour, clearPick, loadPick } from '@/lib/device-store';
import { pour } from '@/lib/copy';
import { catalogSlug } from '@/lib/drinks/register';
import { recentBarNames } from '@/lib/pours/pour-history';
import { userFromProfile, type UserProfile } from '@/lib/palate/profile';
import { guestShift } from '@/lib/palate/guest-palate';
import { closestDrinks } from '@/lib/drinks/search';
import { barPointFor, guestPourRecord, menuChange, toLogOptions, type PourEntry } from '@/lib/pours/pour-entry';
import type { RateRequest } from '@/lib/pours/pour-draft';
import type { TrackStart } from '@/lib/palate/track';
import { useMenu } from '@/hooks/useMenu';
import { clearRateRequestFromUrl } from '@/hooks/useRateSheet';

/** The pour just logged, and your menu as it stood before it, to show what it changed. */
export interface LastPour {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
  menuBefore: string[];
}

/**
 * Rating one pour: the quick picks, the bar, and logging it — to the
 * member's repository, or on the device for a guest — then what it moved.
 * `RatePanel.tsx` draws the panel around it. The record a guest keeps,
 * the bar's point and the menu change are `src/lib/pour-entry.ts`.
 */
export function useRatePour({
  request,
  isMember,
  profile,
  setProfile,
  pours,
  start,
  reload,
}: {
  request: RateRequest;
  isMember: boolean;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  pours: PourRecord[] | null;
  start: TrackStart | null;
  reload: () => Promise<void>;
}) {
  const history = useMemo(() => pours ?? [], [pours]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState(request.draft?.bar ?? '');
  // Kept until it is logged, then gone from state and the URL: the form
  // is replaced by the "moved" screen, and must not offer the same pour twice.
  const [draft, setDraft] = useState(request.draft);
  const [lastPour, setLastPour] = useState<LastPour | null>(null);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { menu } = useMenu(user, profile?.vibeTags, history, start);

  // Quick picks: the drinks closest to where you are now.
  const nearest = useMemo(() => closestDrinks({ x, y }, 4).map((d) => d.name), [x, y]);
  const recentVenues = useMemo(() => recentBarNames(history), [history]);

  const submit = async (entry: PourEntry) => {
    const at = barPointFor(entry, draft);
    setSubmitting(true);
    setError(null);
    const from = { x, y };
    const menuBefore = menu.map((d) => d.name);
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
      // A pick from Compass, now rated.
      if (loadPick()?.drink.toLowerCase() === entry.drinkName.toLowerCase()) clearPick();
      if (draft) setDraft(undefined);
      // Rated: a reload must not offer the same pour again.
      clearRateRequestFromUrl();
      setLastPour({ from, drinkName: entry.drinkName, hedonic: entry.hedonic, menuBefore });
    } catch (err) {
      console.error(err);
      setError(pour.failed);
    } finally {
      setSubmitting(false);
    }
  };

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
  };
}
