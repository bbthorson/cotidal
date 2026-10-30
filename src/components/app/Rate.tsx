import { useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback } from '@/lib/api-client';
import { clearPick, loadPick, addGuestPour } from '@/lib/device-store';
import { coldState, moved, pour, ratePage } from '@/lib/copy';
import { geoLocation } from '@/lib/atproto/location';
import { catalogSlug, titleOf, type Register } from '@/lib/register';
import { recentBarNames } from '@/lib/pour-history';
import { userFromProfile } from '@/lib/profile';
import { guestShift, neutralProfile } from '@/lib/guest-palate';
import { useMenu } from '@/hooks/useMenu';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { withoutDraft, type PourDraft } from '@/lib/pour-draft';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { Moved } from './Moved';
import { PourForm, toLogOptions, type PourEntry } from './PourForm';

interface LastPour {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
  /** Your menu as it stood before the pour, to show what the pour changed on it. */
  menuBefore: string[];
}

/**
 * Rating one pour: the form, then the screen that shows the coordinate
 * moving. It opens with a drink in it when one was handed over ("Log this", a
 * pick from the harbour, a chat assistant's draft) and on the drink closest
 * to you when not. It belongs to no tab; "Back" returns to the ledger.
 */
function RateContent({
  register,
  member,
  initialDrink,
  initialDraft,
}: {
  register: Register;
  member: { handle: string | null } | null;
  initialDrink?: string;
  initialDraft?: PourDraft;
}) {
  const { openSignIn } = useAtprotoContext();
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours, reload } = usePours(isMember);
  const history = useMemo(() => pours ?? [], [pours]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState(initialDraft?.bar ?? '');
  // Kept until it is logged, then gone from state and the URL: the form
  // remounts after the "moved" screen, and must not offer the same pour twice.
  const [draft, setDraft] = useState(initialDraft);
  const [lastPour, setLastPour] = useState<LastPour | null>(null);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { menu } = useMenu(user, profile?.vibeTags, history);

  // Quick picks: the drinks closest to where you are now.
  const nearest = useMemo(
    () =>
      [...drinkDatabase]
        .sort((a, b) => calculateDistance({ x, y }, a) - calculateDistance({ x, y }, b))
        .slice(0, 4)
        .map((d) => d.name),
    [x, y]
  );
  const recentVenues = useMemo(() => recentBarNames(history), [history]);

  const handleSubmit = async (entry: PourEntry) => {
    // Where the bar is, from the map — only while the pour is still at the bar the draft named.
    const at = !entry.isHomePour && draft?.at && draft.bar === entry.venue.trim() ? draft.at : null;
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
        const guestPour: PourRecord = {
          $type: 'app.cotidal.pour',
          drink: { name: entry.drinkName, slug: catalogSlug(register, entry.drinkName) },
          venue: entry.isHomePour
            ? undefined
            : { entity: { name: entry.venue }, ...(at ? { address: geoLocation(at.lat, at.lon, entry.venue) ?? undefined } : {}) },
          rating: { hedonic: entry.hedonic },
          deviations: entry.deviations.length > 0 ? entry.deviations : undefined,
          cata: entry.cata && entry.cata.length > 0 ? entry.cata : undefined,
          note: entry.note || undefined,
          isHomePour: entry.isHomePour,
          createdAt: new Date().toISOString(),
        };
        addGuestPour(guestPour);
        await reload();
      }
      // A pick from the harbour, now rated.
      if (loadPick()?.drink.toLowerCase() === entry.drinkName.toLowerCase()) clearPick();
      if (draft) setDraft(undefined);
      // Rated: a reload must not offer the same pour again.
      const url = withoutDraft(new URL(window.location.href));
      window.history.replaceState(null, '', url);
      setLastPour({ from, drinkName: entry.drinkName, hedonic: entry.hedonic, menuBefore });
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError(pour.failed);
    } finally {
      setSubmitting(false);
    }
  };

  // A stranger with no coordinate: say what this page is, and the ways in.
  if (!profile && !isMember) {
    return (
      <ColdState
        eyebrow={ratePage.title}
        onSignIn={openSignIn}
        onGuest={() => setProfile(neutralProfile)}
      />
    );
  }

  if (lastPour) {
    const menuNow = menu.map((d) => d.name);
    const at = menuNow.findIndex((n) => n.toLowerCase() === lastPour.drinkName.toLowerCase());
    return (
      <Moved
        from={lastPour.from}
        to={{ x, y }}
        drinkName={lastPour.drinkName}
        scoreLabel={pour.scoreOf(lastPour.hedonic)}
        menuChange={{
          rank: at >= 0 ? at + 1 : null,
          newcomer: menuNow.find((n, i) => i !== at && !lastPour.menuBefore.includes(n)) ?? null,
        }}
        displayName={(name) => titleOf(register, name)}
        backLabel={moved.back}
        onDone={() => window.location.assign('/log')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-6 pt-4 lg:pt-8">
      <h1 className="mb-4 border-b border-foreground pb-1.5 font-serif text-xl font-bold">{ratePage.title}</h1>
      <PourForm
        suggestions={nearest}
        suggestionsLabel={pour.nearLabel}
        labelFor={(name) => titleOf(register, name)}
        initialDrink={initialDrink ?? nearest[0]}
        draft={draft}
        venue={venue}
        onVenueChange={setVenue}
        recentVenues={recentVenues}
        isMember={isMember}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
      />
      {!isMember && <p className="mt-3 text-meta text-muted-foreground">{coldState.guestNote}</p>}
    </div>
  );
}

export default function Rate({
  register,
  signInEnabled,
  member,
  initialDrink,
  initialDraft,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { handle: string | null } | null;
  /** The drink to open the form on, from `/rate?drink=`. */
  initialDrink?: string;
  /** A pour drafted in a chat, from `/rate?draft=1` (src/lib/pour-draft.ts). */
  initialDraft?: PourDraft;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <RateContent register={register} member={member} initialDrink={initialDrink} initialDraft={initialDraft} />
    </AtprotoProvider>
  );
}
