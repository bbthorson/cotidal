import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { drinkDatabase } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { logDrinkFeedback } from '@/lib/api-client';
import { clearPick, loadPick, addGuestPour } from '@/lib/device-store';
import { coldState, moved, pour, ratePage } from '@/lib/copy';
import { geoLocation } from '@/lib/atproto/location';
import { catalogSlug, titleOf, type Register } from '@/lib/register';
import { recentBarNames } from '@/lib/pour-history';
import { userFromProfile } from '@/lib/profile';
import { guestShift, neutralProfile } from '@/lib/guest-palate';
import { useMenu } from '@/hooks/useMenu';
import { clearRateRequestFromUrl } from '@/hooks/useRateSheet';
import type { RateRequest } from '@/lib/pour-draft';
import { cn } from '@/lib/utils';
import { useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { Moved } from './Moved';
import { PourForm, toLogOptions, type PourEntry } from './PourForm';
import { ScreenHeader } from './ui';

interface LastPour {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
  /** Your menu as it stood before the pour, to show what the pour changed on it. */
  menuBefore: string[];
}

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
  const history = useMemo(() => pours ?? [], [pours]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState(request.draft?.bar ?? '');
  // Kept until it is logged, then gone from state and the URL: the form
  // is replaced by the "moved" screen, and must not offer the same pour twice.
  const [draft, setDraft] = useState(request.draft);
  const [lastPour, setLastPour] = useState<LastPour | null>(null);
  const content = useRef<HTMLDivElement>(null);
  // Whatever opened the sheet gets focus back (there is no trigger element to hand Radix).
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

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

  // The result replaces the form: start it from the top.
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [lastPour]);

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

  // A stranger with no coordinate: say what this is, and the ways in.
  const cold = !profile && !isMember;
  const reveal = !cold && !!lastPour;

  let body;
  if (cold) {
    body = <ColdState eyebrow={ratePage.title} onSignIn={openSignIn} onGuest={() => setProfile(neutralProfile)} />;
  } else if (lastPour) {
    const menuNow = menu.map((d) => d.name);
    const at = menuNow.findIndex((n) => n.toLowerCase() === lastPour.drinkName.toLowerCase());
    body = (
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
        onDone={onClose}
      />
    );
  } else {
    body = (
      <div className="mx-auto w-full max-w-xl pb-2 pt-2">
        <ScreenHeader eyebrow={ratePage.title} title={ratePage.heading} />
        <PourForm
          suggestions={nearest}
          suggestionsLabel={pour.nearLabel}
          labelFor={(name) => titleOf(register, name)}
          initialDrink={request.drink ?? nearest[0]}
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

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        // A pour on its way to being written is not abandoned half-way.
        if (!open && !submitting) onClose();
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
            reveal
              ? 'inset-0 bg-reveal text-reveal-foreground sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2'
              : 'inset-x-0 bottom-0 border-t border-foreground bg-background px-6 pb-8 pt-3 text-foreground max-sm:data-open:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:pt-4 sm:shadow-mcm'
          )}
        >
          <Dialog.Title className="sr-only">{ratePage.title}</Dialog.Title>
          <Dialog.Description className="sr-only">{ratePage.description}</Dialog.Description>
          {!reveal && (
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
