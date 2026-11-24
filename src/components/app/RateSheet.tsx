import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { coldState, moved, pour, ratePage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import type { RateRequest } from '@/lib/pour-draft';
import { useRatePour } from '@/hooks/useRatePour';
import { cn } from '@/lib/utils';
import { useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { Moved } from './Moved';
import { PourForm } from './PourForm';
import { ScreenHeader } from './ui';

/** What the screen underneath shares with the sheet, so it is current the moment the sheet closes. */
export interface RateSheetProps {
  /** `null` while the sheet is closed. */
  request: RateRequest | null;
  onClose: () => void;
  register: Register;
  member: { handle: string | null } | null;
  /** The screen's own coordinate and pours: a pour updates them in place. */
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  pours: PourRecord[] | null;
  reload: () => Promise<void>;
}

/**
 * Rating one pour, as a sheet over the screen you are on: the form, then the
 * screen that shows the coordinate moving. It opens on a drink when one was
 * handed over ("Rate this", a pick, a chat assistant's draft, `?rate=`) and
 * on the drink closest to you when not. Closing it returns to the screen
 * underneath, which already holds the new coordinate and pour.
 *
 * Mounted by each screen that can rate, driven by `useRateSheet`. It is a
 * dialog (focus trapped and returned, Escape closes, scrolls on a phone); a
 * tap outside does not close it, so a half-written note is not lost.
 * Logging the pour, and what it moved, is `useRatePour`.
 */
export function RateSheet({ request, ...rest }: RateSheetProps) {
  // Mounted only while open: each opening starts a form of its own.
  return request ? <RateDialog request={request} {...rest} /> : null;
}

function RateDialog({
  request,
  onClose,
  register,
  member,
  profile,
  setProfile,
  pours,
  reload,
}: Omit<RateSheetProps, 'request'> & { request: RateRequest }) {
  const { openSignIn } = useAtprotoContext();
  const isMember = !!member;
  const r = useRatePour({ request, isMember, profile, setProfile, pours, reload });
  const content = useRef<HTMLDivElement>(null);
  // Whatever opened the sheet gets focus back (there is no trigger element to hand Radix).
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  // The result replaces the form: start it from the top.
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [r.lastPour]);

  let body;
  if (r.cold) {
    body = <ColdState eyebrow={ratePage.title} onSignIn={openSignIn} onGuest={() => setProfile(neutralProfile)} />;
  } else if (r.lastPour && r.menuChange) {
    body = (
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
    );
  } else {
    body = (
      <div className="mx-auto w-full max-w-xl pb-2 pt-2">
        <ScreenHeader eyebrow={ratePage.title} title={ratePage.heading} />
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
      </div>
    );
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        // A pour on its way to being written is not abandoned half-way.
        if (!open && !r.submitting) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim data-open:animate-in data-open:fade-in-0" />
        <Dialog.Content
          ref={content}
          onPointerDownOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (opener?.isConnected) opener.focus();
          }}
          className={cn(
            'fixed z-50 flex max-h-dvh flex-col overflow-y-auto focus:outline-none data-open:animate-in data-open:fade-in-0',
            // The payoff is the reveal ground, full-bleed on a phone; everything else is paper.
            r.reveal
              ? 'inset-0 bg-reveal text-reveal-foreground sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2'
              : 'inset-x-0 bottom-0 border-t border-foreground bg-background px-6 pb-8 pt-3 text-foreground max-sm:data-open:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:pt-4 sm:shadow-mcm'
          )}
        >
          <Dialog.Title className="sr-only">{ratePage.title}</Dialog.Title>
          <Dialog.Description className="sr-only">{ratePage.description}</Dialog.Description>
          {!r.reveal && (
            <>
              <div aria-hidden="true" className="h-0.75 w-10 shrink-0 self-center bg-border sm:hidden" />
              <Dialog.Close className="link-caps shrink-0 self-end text-muted-foreground hover:text-foreground">
                {ratePage.close}
              </Dialog.Close>
            </>
          )}
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
