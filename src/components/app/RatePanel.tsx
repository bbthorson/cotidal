import { useEffect } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { coldState, moved, pour, ratePage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import type { RateRequest } from '@/lib/pour-draft';
import { useRatePour } from '@/hooks/useRatePour';
import { useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { Moved } from './Moved';
import { PourForm } from './PourForm';
import { ScreenHeader } from './ui';

/**
 * Rating one pour, in the map's card: the form, then the screen that shows
 * what the pour moved. It opens on a drink when one was handed over ("Rate
 * this" on a drink, a waiting pick, a chat assistant's draft, `?rate=`) and on
 * the drink closest to you when not. Done returns the card to where it was,
 * which already holds the new pour.
 *
 * The card holds it, not a dialog: rating happens where you found the drink.
 * Logging the pour, and what it moved, is `useRatePour`.
 */
/** How a pour just moved you: drawn on the map while the reveal is in the card. */
export interface PourMove {
  from: { x: number; y: number };
  to: { x: number; y: number };
  drinkName: string;
}

export function RatePanel({
  request,
  onClose,
  register,
  member,
  profile,
  setProfile,
  pours,
  reload,
  onReveal,
}: {
  request: RateRequest;
  onClose: () => void;
  register: Register;
  member: { handle: string | null } | null;
  /** The screen's own coordinate and pours: a pour updates them in place. */
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  pours: PourRecord[] | null;
  reload: () => Promise<void>;
  /**
   * Told when the form gives way to the reveal, and how the pour moved you,
   * so the card takes the reveal ground and the map draws the move.
   */
  onReveal: (move: PourMove | null) => void;
}) {
  const { openSignIn } = useAtprotoContext();
  const isMember = !!member;
  const r = useRatePour({ request, isMember, profile, setProfile, pours, reload });

  // The screen scrolls to the map when the reveal takes the card (`Explore`), so the move shows.
  const move = r.reveal && r.lastPour ? { from: r.lastPour.from, to: r.to, drinkName: r.lastPour.drinkName } : null;
  const moveKey = move ? `${move.from.x},${move.from.y},${move.to.x},${move.to.y},${move.drinkName}` : '';
  useEffect(() => {
    onReveal(move);
    // `move` is derived from the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveKey, onReveal]);
  useEffect(() => () => onReveal(null), [onReveal]);

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
        submitting={r.submitting}
        error={r.error}
        onSubmit={r.submit}
      />
      {!isMember && <p className="mt-3 text-meta text-muted-foreground">{coldState.guestNote}</p>}
    </section>
  );
}
