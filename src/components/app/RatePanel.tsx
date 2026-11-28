import type { UserProfile } from '@/lib/palate/profile';
import { coldState, moved, pour, ratePage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/drinks/register';
import { neutralProfile } from '@/lib/palate/guest-palate';
import type { RateRequest } from '@/lib/pours/pour-draft';
import type { RatePourState } from '@/hooks/useRatePour';
import { useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { Moved } from './Moved';
import { PourForm } from './PourForm';
import { ScreenHeader } from './ui';

/**
 * Rating one pour, in the map's card: the form, then the screen that shows
 * what the pour moved. It opens on a drink when one was handed over ("Rate
 * this" on a drink, a waiting pick's "What was off" / "More detail", a chat
 * assistant's draft, `?rate=`) and on the drink closest to you when not.
 * Inline one-tap rating on `WaitingPick` logs through the same `useRatePour`
 * state and lands directly on `Moved`.
 */
/** How a pour just moved you: drawn on the map while the reveal is in the card. */
export interface PourMove {
  from: { x: number; y: number };
  to: { x: number; y: number };
  drinkName: string;
}

export function RatePanel({
  request,
  ratePour: r,
  onClose,
  register,
  isMember,
  setProfile,
}: {
  request: RateRequest;
  ratePour: RatePourState;
  onClose: () => void;
  register: Register;
  isMember: boolean;
  setProfile: (profile: UserProfile) => void;
}) {
  const { openSignIn } = useAtprotoContext();

  if (r.cold) {
    return (
      <section aria-label={ratePage.title}>
        <ColdState eyebrow={ratePage.title} onSignIn={openSignIn} onGuest={() => setProfile(neutralProfile)} />
      </section>
    );
  }
  if (r.lastPour && r.menuChange) {
    return (
      <section aria-label={ratePage.title}>
        <Moved
          from={r.lastPour.from}
          to={r.to}
          drinkName={r.lastPour.drinkName}
          hedonic={r.lastPour.hedonic}
          scoreLabel={pour.scoreOf(r.lastPour.hedonic)}
          menuChange={r.menuChange}
          displayName={(name) => titleOf(register, name)}
          backLabel={moved.back}
          onDone={onClose}
        />
      </section>
    );
  }
  return (
    <section aria-label={ratePage.title} className="w-full pb-2">
      <div className="flex items-baseline justify-between gap-4">
        <ScreenHeader eyebrow={ratePage.title} title={ratePage.heading} />
        <button type="button" onClick={onClose} className="link-caps shrink-0 text-muted-foreground hover:text-foreground">
          {ratePage.close}
        </button>
      </div>
      <PourForm
        suggestions={r.nearest}
        suggestionsLabel={pour.nearLabel}
        labelFor={(name) => titleOf(register, name)}
        initialDrink={request.drink ?? r.nearest[0]}
        draft={r.draft}
        venue={r.venue}
        onVenueChange={r.setVenue}
        recentVenues={r.recentVenues}
        isMember={isMember}
        openDetail={request.openDetail}
        submitting={r.submitting}
        error={r.error}
        onSubmit={r.submit}
      />
      {!isMember && <p className="mt-3 text-meta text-muted-foreground">{coldState.guestNote}</p>}
    </section>
  );
}
