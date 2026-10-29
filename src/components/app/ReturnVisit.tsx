import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAtprotoContext, AtprotoProvider } from './AtprotoProvider';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { calculateDistance } from '@/lib/scoring';
import { formatCoordinate } from '@/lib/coordinate';
import type { PourRecord } from '@/lib/atproto/records';
import { logDrinkFeedback, getConnectedPours, getConnectedPalate } from '@/lib/api-client';
import { loadGuestState, loadProfile, saveGuestState, saveProfile, loadOpenOrder, clearOpenOrder, loadGuestPours, addGuestPour } from '@/lib/device-store';
import { returnVisit, pour, logPage, nav } from '@/lib/copy';
import { START_OVER_PARAM } from '@/lib/atproto/paths';
import { catalogSlug, type Register } from '@/lib/register';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { MapThumb } from './CoordinateMap';
import { Moved } from './Moved';
import { PourForm, toLogOptions, type PourEntry } from './PourForm';
import { withoutDraft, type PourDraft } from '@/lib/pour-draft';
import { PourLedger } from './PourLedger';
import { SignInSheet } from './SignInSheet';
import { OpenOrder } from './OpenOrder';
import { AccountTools } from './AccountTools';
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
  member,
  initialDrink,
  initialDraft,
}: {
  register: Register;
  member: { handle: string | null } | null;
  initialDrink?: string;
  initialDraft?: PourDraft;
}) {
  const { isConnected, isEnabled } = useAtprotoContext();

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
  // The form shows only while rating something: a drink handed over ("Log
  // this", an order from the harbour, a chat's draft), or one asked for here.
  const [rating, setRating] = useState(!!initialDrink || !!initialDraft);

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
      setPours(loadGuestPours());
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
    setRating(true);
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
        addGuestPour(guestPour);
        setPours((prev) => [guestPour, ...prev]);
      }
      // An order from the harbour, now rated.
      if (loadOpenOrder()?.drink.toLowerCase() === entry.drinkName.toLowerCase()) clearOpenOrder();
      if (draft) setDraft(undefined);
      // Rated: the form closes, and a reload must not offer the same pour again.
      const url = withoutDraft(new URL(window.location.href));
      url.searchParams.delete('drink');
      window.history.replaceState(null, '', url);
      setRating(false);
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

  const bars = new Set(pours.filter((p) => !p.isHomePour && p.venue?.entity?.name).map((p) => p.venue!.entity!.name)).size;
  const first = pours.length > 0 ? pours[pours.length - 1] : null;
  const best = pours.reduce<PourRecord | null>((top, p) => (!top || p.rating.hedonic > top.rating.hedonic ? p : top), null);
  const stats = [
    { label: logPage.stats.pours, value: String(pours.length) },
    { label: logPage.stats.bars, value: String(bars) },
    ...(first
      ? [
          {
            label: logPage.stats.since,
            value: new Date(first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
    ...(best ? [{ label: logPage.stats.best, value: register[best.drink.name]?.title ?? best.drink.name }] : []),
  ];

  return (
    <div className="mx-auto max-w-xl pb-6 pt-5 lg:pt-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-foreground pb-2">
        <h1 className="font-serif text-title font-bold text-foreground">{logPage.title}</h1>
        <span className={member?.handle ? 'font-body text-meta font-bold text-foreground' : 'label-caps'}>
          {member?.handle ? `@${member.handle}` : member ? '' : logPage.guestEyebrow}
        </span>
      </header>

      {/* Where you are now, and what the log adds up to */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label-caps">{returnVisit.youAreIn}</span>
          <a href={`/regions/${region.id}`} className="font-serif text-2xl italic leading-none text-primary hover:underline">
            {region.name}
          </a>
          <span className="font-condensed text-xs font-semibold tabular-nums tracking-label text-secondary">
            {formatCoordinate(x, y)}
          </span>
        </div>
        <a href="/taste" aria-label={nav.map}>
          <MapThumb x={x} y={y} />
        </a>
      </div>
      <dl className="mt-4 grid grid-cols-2 border-t border-foreground">
        {stats.map((st, i) => (
          <div key={st.label} className={`flex flex-col gap-0.5 border-b border-border py-2.5 ${i % 2 ? 'pl-4' : 'border-r pr-4'}`}>
            <dt className="label-caps">{st.label}</dt>
            <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        {!rating && <OpenOrder displayName={(n) => register[n]?.title ?? n} />}
      </div>

      {rating && (
        <section className="mt-6">
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
      )}

      <section className="mt-8">
        <div className="mb-1 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-bold">{returnVisit.ledgerTitle}</h2>
          {!rating && (
            <button
              type="button"
              onClick={() => setRating(true)}
              className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-secondary hover:text-primary"
            >
              {logPage.logDirectly}
            </button>
          )}
        </div>
        <PourLedger pours={pours} register={register} empty={returnVisit.ledgerEmpty} loading={loading} />
      </section>

      {/* A guest: what signing in buys, once, under the log it would keep. */}
      {!member && isEnabled && (
        <div className="mt-6 flex items-center gap-3 border border-border bg-card p-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-serif text-base font-bold">{logPage.guestTitle}</span>
            <span className="text-meta text-muted-foreground">{logPage.guestBody}</span>
          </div>
          <button type="button" onClick={() => setSignInOpen(true)} className="btn btn-primary shrink-0 px-3.5">
            {nav.signIn}
          </button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{logPage.settingsTitle}</h2>
        <AccountTools
          handle={member?.handle ?? null}
          topName={register[nearest[0]]?.title ?? nearest[0] ?? ''}
          regionName={region.name}
          onStartOver={() => window.location.assign(`/taste?${START_OVER_PARAM}=1`)}
        />
      </section>
      {sheet}
    </div>
  );
}

export default function ReturnVisit({
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
  /** The drink to open the form on, from `/log?drink=`. */
  initialDrink?: string;
  /** A pour drafted in a chat, from `/log?draft=1` (src/lib/pour-draft.ts). */
  initialDraft?: PourDraft;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <ReturnVisitContent register={register} member={member} initialDrink={initialDrink} initialDraft={initialDraft} />
    </AtprotoProvider>
  );
}
