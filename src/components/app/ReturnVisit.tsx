import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAtprotoContext, AtprotoProvider } from './AtprotoProvider';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { calculateDistance } from '@/lib/scoring';
import { formatCoordinate } from '@/lib/coordinate';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback, getConnectedPours, getConnectedPalate } from '@/lib/api-client';
import { returnVisit, pour } from '@/lib/copy';
import type { Register } from '@/lib/register';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { MapThumb } from './CoordinateMap';
import { Moved } from './Moved';
import { PourForm, hedonicToRating, type PourEntry } from './PourForm';
import { PourLedger } from './PourLedger';
import { SignInSheet } from './SignInSheet';
import { createInitialPalateState, applyPour, projectTo2D } from '@/lib/palate-state';

function slugifyDrink(name: string): string {
  return name
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getInitialLocalProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('user_profile');
    return saved ? (JSON.parse(saved) as UserProfile) : null;
  } catch {
    return null;
  }
}

/**
 * A guest's pour moves the coordinate on this device only, by the exact same
 * Extended Kalman Filter (EKF) rules the server applies.
 */
function guestShift(profile: UserProfile | null, entry: PourEntry): UserProfile {
  const prior = createInitialPalateState({
    x: profile?.x ?? 0,
    y: profile?.y ?? 0,
    dislikesBitter: profile?.dislikesBitter ?? false,
  });

  const drink = drinkDatabase.find((d) => d.name.toLowerCase() === entry.drinkName.toLowerCase());
  const coords = projectTo2D(applyPour(prior, drink, { hedonic: entry.hedonic }));

  const updatedVibeTags = { ...(profile?.vibeTags ?? {}) };
  if (entry.hedonic >= 7 && drink) {
    drink.tags.forEach((tag) => {
      updatedVibeTags[tag] = Math.min(5.0, (updatedVibeTags[tag] || 0) + 0.25);
    });
  }

  return {
    x: coords.x,
    y: coords.y,
    dislikesSmoke: profile?.dislikesSmoke ?? false,
    dislikesBitter: profile?.dislikesBitter ?? false,
    dislikesAnise: profile?.dislikesAnise ?? false,
    vibeTags: updatedVibeTags,
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
function ReturnVisitContent({ register }: { register: Register }) {
  const { isConnected } = useAtprotoContext();

  const [profile, setProfile] = useState<UserProfile | null>(getInitialLocalProfile);
  const [pours, setPours] = useState<PourRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [lastPour, setLastPour] = useState<LastPour | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (isConnected) {
      setLoading(true);
      try {
        const [palateData, pourData] = await Promise.all([getConnectedPalate(), getConnectedPours(50)]);
        if (palateData) {
          setProfile(palateData);
          localStorage.setItem('user_profile', JSON.stringify(palateData));
        }
        setPours(pourData);
      } catch (err) {
        console.error('Failed to load data from AT Protocol:', err);
      } finally {
        setLoading(false);
      }
    } else {
      const local = getInitialLocalProfile();
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
    localStorage.setItem('user_profile', JSON.stringify(neutral));
  };

  const handleSubmit = async (entry: PourEntry) => {
    setSubmitting(true);
    setError(null);
    const from = { x, y };
    try {
      if (isConnected) {
        const result = await logDrinkFeedback({
          drinkName: entry.drinkName,
          rating: hedonicToRating(entry.hedonic),
          isHomePour: entry.isHomePour,
          location: entry.isHomePour ? 'Home Pour' : entry.venue,
          venue: entry.isHomePour ? undefined : { name: entry.venue },
          deviations: entry.deviations,
          cata: entry.cata,
          note: entry.note || undefined,
          crosspostToFeed: entry.crosspost,
          baseSpirit: entry.detail?.baseSpirit,
          glassware: entry.detail?.glassware,
          garnish: entry.detail?.garnish || undefined,
          sensoryProfile: entry.detail?.sensory,
        });
        if (!result.success || !result.profile) {
          setError(result.error || pour.failed);
          return;
        }
        setProfile(result.profile);
        localStorage.setItem('user_profile', JSON.stringify(result.profile));
        await loadData();
      } else {
        const updated = guestShift(profile, entry);
        setProfile(updated);
        localStorage.setItem('user_profile', JSON.stringify(updated));
        const guestPour: PourRecord = {
          $type: 'app.crystalcoupe.pour',
          drink: { name: entry.drinkName, slug: slugifyDrink(entry.drinkName) },
          venue: entry.isHomePour ? undefined : { entity: { name: entry.venue } },
          rating: { hedonic: entry.hedonic, wouldOrderAgain: entry.hedonic >= 7 },
          deviations: entry.deviations.length > 0 ? entry.deviations : undefined,
          cata: entry.cata && entry.cata.length > 0 ? entry.cata : undefined,
          note: entry.note || undefined,
          isHomePour: entry.isHomePour,
          createdAt: new Date().toISOString(),
        };
        setPours((prev) => [guestPour, ...prev]);
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
            className="inline-flex min-h-13 items-center justify-center border border-foreground bg-secondary px-6 font-condensed text-sm font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {returnVisit.quizCta}
          </a>
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="min-h-12 border border-foreground bg-transparent px-6 font-condensed text-meta font-semibold uppercase tracking-label text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          initialDrink={nearest[0]}
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

export default function ReturnVisit({ register }: { register: Register }) {
  return (
    <AtprotoProvider>
      <ReturnVisitContent register={register} />
    </AtprotoProvider>
  );
}
