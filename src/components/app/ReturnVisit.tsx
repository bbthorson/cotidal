import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAtprotoContext, AtprotoProvider } from './AtprotoProvider';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { calculateDistance } from '@/lib/scoring';
import { formatCoordinate } from '@/lib/coordinate';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback, getConnectedPours, getConnectedPalate } from '@/lib/api-client';
import { loadGuestState, loadProfile, saveGuestState, saveProfile, loadOpenOrder, clearOpenOrder } from '@/lib/device-store';
import { returnVisit, pour } from '@/lib/copy';
import { catalogSlug, type Register } from '@/lib/register';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { MapThumb } from './CoordinateMap';
import { Moved } from './Moved';
import { PourForm, toLogOptions, type PourEntry } from './PourForm';
import { withoutDraft, type PourDraft } from '@/lib/pour-draft';
import { PourLedger } from './PourLedger';
import { SignInSheet } from './SignInSheet';
import {
  createInitialPalateState,
  applyPour,
  aversionsAfterPour,
  vibeTagsAfterPour,
  projectTo2D,
  fromDynamicRecord,
  toDynamicRecord,
} from '@/lib/palate-state';


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
function guestShift(profile: UserProfile | null, entry: PourEntry): UserProfile {
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

interface LastPour {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
}

/**
 * The return visit (/log): where you are, a pour to log, and the ledger of
 * what moved you. Logging ends on the same "your coordinate moved" screen as
 * the Log tab in /taste — the one recurring behaviour, given a face.
 */
function ReturnVisitContent({
  register,
  initialDrink,
  initialDraft,
}: {
  register: Register;
  initialDrink?: string;
  initialDraft?: PourDraft;
}) {
  const { isConnected } = useAtprotoContext();

  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);
  const [pours, setPours] = useState<PourRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState(initialDraft?.bar ?? '');
  // Kept until it is logged, then gone from state and the URL: the form
  // remounts after the "moved" screen, and must not offer the same pour twice.
  const [draft, setDraft] = useState(initialDraft);
  const [lastPour, setLastPour] = useState<LastPour | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (isConnected) {
      setLoading(true);
      try {
        const [palateData, pourData] = await Promise.all([getConnectedPalate(), getConnectedPours(50)]);
        if (palateData) {
          setProfile(palateData);
          saveProfile(palateData);
        }
        setPours(pourData);
      } catch (err) {
        console.error('Failed to load data from AT Protocol:', err);
      } finally {
        setLoading(false);
      }
    } else {
      const local = loadProfile();
      if (local) setProfile(local);
    }
  }, [isConnected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [lastPour]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const region = quadrantFor(x, y);

  // Quick picks: the drinks closest to where you are now.
  const nearest = useMemo(
    () =>
      [...drinkDatabase]
        .sort((a, b) => calculateDistance({ x, y }, a) - calculateDistance({ x, y }, b))
        .slice(0, 4)
        .map((d) => d.name),
    [x, y]
  );

  const recentVenues = useMemo(
    () =>
      Array.from(
        new Set(
          pours
            .filter((p) => !p.isHomePour)
            .map((p) => p.venue?.entity?.name)
            .filter((v): v is string => !!v && v.trim().length > 0)
        )
      ),
    [pours]
  );

  const startAsGuest = () => {
    const neutral: UserProfile = {
      x: 0,
      y: 0,
      dislikesSmoke: false,
      dislikesBitter: false,
      dislikesAnise: false,
      vibeTags: {},
    };
    setProfile(neutral);
    saveProfile(neutral);
  };

  const handleSubmit = async (entry: PourEntry) => {
    setSubmitting(true);
    setError(null);
    const from = { x, y };
    try {
      if (isConnected) {
        const result = await logDrinkFeedback(toLogOptions(entry));
        if (!result.success || !result.profile) {
          setError(result.error || pour.failed);
          return;
        }
        setProfile(result.profile);
        saveProfile(result.profile);
        await loadData();
      } else {
        const updated = guestShift(profile, entry);
        setProfile(updated);
        saveProfile(updated);
        const guestPour: PourRecord = {
          $type: 'app.cotidal.pour',
          drink: { name: entry.drinkName, slug: catalogSlug(register, entry.drinkName) },
          venue: entry.isHomePour ? undefined : { entity: { name: entry.venue } },
          rating: { hedonic: entry.hedonic },
          deviations: entry.deviations.length > 0 ? entry.deviations : undefined,
          cata: entry.cata && entry.cata.length > 0 ? entry.cata : undefined,
          note: entry.note || undefined,
          isHomePour: entry.isHomePour,
          createdAt: new Date().toISOString(),
        };
        setPours((prev) => [guestPour, ...prev]);
      }
      // An order from the harbour, now rated.
      if (loadOpenOrder()?.drink.toLowerCase() === entry.drinkName.toLowerCase()) clearOpenOrder();
      if (draft) {
        setDraft(undefined);
        window.history.replaceState(null, '', withoutDraft(new URL(window.location.href)));
      }
      setLastPour({ from, drinkName: entry.drinkName, hedonic: entry.hedonic });
    } catch (err) {
      console.error(err);
      setError(pour.failed);
    } finally {
      setSubmitting(false);
    }
  };

  const sheet = <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />;

  // A stranger with no coordinate: say what this page is, and the ways in.
  if (!profile && !isConnected) {
    return (
      <div className="mx-auto max-w-xl py-10 md:py-14">
        <span className="label-caps text-secondary">{returnVisit.eyebrow}</span>
        <h1 className="mt-3 font-serif text-title font-bold text-foreground">{returnVisit.coldTitle}</h1>
        <p className="mt-3 font-serif text-prose text-muted-foreground">{returnVisit.coldBody}</p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/taste"
            className="btn btn-primary btn-lg px-6"
          >
            {returnVisit.quizCta}
          </a>
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="btn btn-outline px-6"
          >
            {returnVisit.signInCta}
          </button>
          <button
            type="button"
            onClick={startAsGuest}
            className="mt-1 min-h-11 self-center px-2 font-condensed text-meta uppercase tracking-label text-muted-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary"
          >
            {returnVisit.guestCta}
          </button>
          <p className="text-center text-meta text-muted-foreground">{returnVisit.guestNote}</p>
        </div>
        {sheet}
      </div>
    );
  }

  if (lastPour) {
    return (
      <Moved
        from={lastPour.from}
        to={{ x, y }}
        drinkName={lastPour.drinkName}
        scoreLabel={pour.scoreOf(lastPour.hedonic)}
        displayName={(name) => register[name]?.title ?? name}
        backLabel={returnVisit.movedBack}
        onDone={() => setLastPour(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-6 pt-8 md:pt-12">
      <header className="flex flex-col gap-2">
        <span className="label-caps text-secondary">{returnVisit.eyebrow}</span>
        <h1 className="font-serif text-title font-bold text-foreground">{returnVisit.title}</h1>
        <p className="font-serif text-prose text-muted-foreground">{returnVisit.intro}</p>
      </header>

      {/* Where you are now */}
      <div className="mt-8 border-y border-foreground py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="label-caps">{returnVisit.youAreIn}</span>
            <span className="font-serif text-2xl italic leading-none text-primary">{region.name}</span>
          </div>
          <MapThumb x={x} y={y} />
        </div>
        <div className="dot-leader mt-3">
          <span className="font-condensed text-sm font-semibold tabular-nums tracking-wider">{formatCoordinate(x, y)}</span>
          <span aria-hidden="true" className="leader" />
          <span className="font-condensed text-sm uppercase tracking-label text-muted-foreground">
            {returnVisit.poursLabel(pours.length)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6">
          <a
            href="/taste"
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-primary hover:underline"
          >
            {returnVisit.menuLink} &rarr;
          </a>
          <a
            href={`/regions/${region.id}`}
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground"
          >
            {returnVisit.regionLink} &rarr;
          </a>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 border-b border-foreground pb-1.5 font-serif text-xl font-bold">{returnVisit.logTitle}</h2>
        <PourForm
          suggestions={nearest}
          suggestionsLabel={pour.nearLabel}
          labelFor={(name) => register[name]?.title ?? name}
          initialDrink={initialDrink ?? nearest[0]}
          draft={draft}
          venue={venue}
          onVenueChange={setVenue}
          recentVenues={recentVenues}
          isMember={isConnected}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
        {!isConnected && <p className="mt-3 text-meta text-muted-foreground">{returnVisit.guestNote}</p>}
      </section>

      <section className="mt-12">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-bold">{returnVisit.ledgerTitle}</h2>
          <span className="label-caps text-secondary">{returnVisit.poursLabel(pours.length)}</span>
        </div>
        <PourLedger pours={pours} register={register} empty={returnVisit.ledgerEmpty} loading={loading} />
      </section>
      {sheet}
    </div>
  );
}

export default function ReturnVisit({
  register,
  signInEnabled,
  initialDrink,
  initialDraft,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The drink to open the form on, from `/log?drink=`. */
  initialDrink?: string;
  /** A pour drafted in a chat, from `/log?draft=1` (src/lib/pour-draft.ts). */
  initialDraft?: PourDraft;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <ReturnVisitContent register={register} initialDrink={initialDrink} initialDraft={initialDraft} />
    </AtprotoProvider>
  );
}
