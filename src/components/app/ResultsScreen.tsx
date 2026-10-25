import { useMemo, useState, useEffect, useCallback } from 'react';
import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { calculateWeightedRelevance } from '@/lib/scoring';
import { quadrantFor } from '@/lib/quadrant';
import { hero, menu, nav, pour, publicMap, returnVisit } from '@/lib/copy';
import { publicMapPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';
import { PourForm, toLogOptions, type PourEntry } from './PourForm';
import { PourLedger } from './PourLedger';
import { MapTab } from './MapTab';
import { AppNavigation, type ActiveTab } from './AppNavigation';
import { useAtprotoContext } from './AtprotoProvider';
import { MapThumb } from './CoordinateMap';
import { Moved } from './Moved';
import {
  explainDrinkMatch,
  getConnectedPours,
  logDrinkFeedback,
  refinePalateWithAI,
  sharePalateToFeed,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { PourRecord } from '@/lib/atproto/records';

interface ResultsScreenProps {
  user: User;
  /** False when browsing without having answered the questions. */
  hasCoordinate: boolean;
  vibeTags?: Record<string, number>;
  register: Register;
  onPalateUpdated?: (profile: UserProfile) => void;
  onRequestSignIn: () => void;
  onStartOver: () => void;
}

type ScoredDrink = Drink & { score: number };

/** The menu: the top pick and seven more. */
const MENU_LENGTH = 8;

interface PourMoved {
  from: { x: number; y: number };
  drinkName: string;
  hedonic: number;
  /** The go-to menu before the pour, by name. */
  before: string[];
}

/**
 * Your menu, which replaced the old results dashboard. One list, ranked by
 * relevance alone; the top pick is the one sheet that is yours. The radar
 * chart, the archetype and the Oracle tab are retired: the region is the
 * only identity.
 */
export function ResultsScreen({
  user,
  hasCoordinate,
  vibeTags,
  register,
  onPalateUpdated,
  onRequestSignIn,
  onStartOver,
}: ResultsScreenProps) {
  const { isEnabled, isConnected, handle, disconnect } = useAtprotoContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [history, setHistory] = useState<PourRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pourMoved, setPourMoved] = useState<PourMoved | null>(null);
  /** A drink chosen with "Log this" on the Map tab, to open the form on. */
  const [logDraft, setLogDraft] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isConnected) return;
    setLoadingHistory(true);
    try {
      setHistory(await getConnectedPours(50));
    } catch (e) {
      console.error('Failed to load tasted history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const recentVenues = useMemo(
    () =>
      Array.from(
        new Set(
          history
            .map((h) => (h.isHomePour ? 'Home Pour' : h.venue?.entity?.name))
            .filter((loc): loc is string => !!loc && loc.trim().length > 0)
        )
      ),
    [history]
  );

  // Filter, then score by weighted relevance (coordinate, vibe, history, venue).
  const baseScored = useMemo(() => {
    const dislikesSmoke = user.filters.includes('noSmoke');
    const dislikesBitter = user.filters.includes('noBitter');
    const dislikesAnise = user.filters.includes('noAnise');

    const logs = history.map((pour) => ({
      drinkName: pour.drink.name,
      location: pour.isHomePour ? 'Home Pour' : pour.venue?.entity?.name,
      hedonicScale: pour.rating.hedonic,
      createdAt: pour.createdAt,
    }));

    return drinkDatabase
      .filter((d) => !(dislikesSmoke && d.hasSmoke) && !(dislikesBitter && d.isBitter) && !(dislikesAnise && d.hasAnise))
      .filter((drink) => {
        // A drink you rated 3 or lower last time comes off the menu.
        const latest = logs
          .filter((log) => log.drinkName.toLowerCase() === drink.name.toLowerCase())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        return !(latest && latest.hedonicScale <= 3);
      })
      .map((drink) => ({
        drink,
        relevance: calculateWeightedRelevance(
          { x: user.x, y: user.y, vibeTags: vibeTags || null },
          drink,
          logs,
          selectedLocation
        ),
      }));
  }, [user, vibeTags, history, selectedLocation]);

  // The menu ranks by relevance alone.
  const goTo = useMemo(
    (): ScoredDrink[] =>
      baseScored
        .map(({ drink, relevance }) => ({ ...drink, score: relevance }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MENU_LENGTH),
    [baseScored]
  );
  const closeness = useMemo(
    () => Object.fromEntries(baseScored.map(({ drink, relevance }) => [drink.name, relevance])),
    [baseScored]
  );

  const displayName = useCallback((name: string) => register[name]?.title ?? name, [register]);
  const region = quadrantFor(user.x, user.y);

  const changeTab = (tab: ActiveTab) => {
    // Logging needs an account. A guest gets the one sign-in sheet instead.
    if (tab === 'log' && isEnabled && !isConnected) {
      onRequestSignIn();
      return;
    }
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const handleLog = async (entry: PourEntry) => {
    setLogging(true);
    setLogError(null);
    try {
      const result = await logDrinkFeedback(toLogOptions(entry));
      if (result.success && result.profile) {
        setLogDraft(null);
        setPourMoved({
          from: { x: user.x, y: user.y },
          drinkName: entry.drinkName,
          hedonic: entry.hedonic,
          before: goTo.map((d) => d.name),
        });
        onPalateUpdated?.(result.profile);
        fetchHistory();
      } else {
        setLogError(result.error || pour.failed);
      }
    } catch {
      setLogError(pour.failed);
    } finally {
      setLogging(false);
    }
  };

  if (pourMoved) {
    const after = goTo.map((d) => d.name);
    const index = after.findIndex((n) => n.toLowerCase() === pourMoved.drinkName.toLowerCase());
    const newcomer =
      after.find(
        (n) => !pourMoved.before.includes(n) && n.toLowerCase() !== pourMoved.drinkName.toLowerCase()
      ) ?? null;
    return (
      <Moved
        from={pourMoved.from}
        to={{ x: user.x, y: user.y }}
        drinkName={pourMoved.drinkName}
        scoreLabel={pour.scoreOf(pourMoved.hedonic)}
        menuChange={{ rank: index >= 0 ? index + 1 : null, newcomer }}
        displayName={displayName}
        onDone={() => {
          setPourMoved(null);
          setActiveTab('menu');
        }}
      />
    );
  }

  const top = goTo[0];
  const rest = goTo.slice(1);

  return (
    <div className="mx-auto max-w-xl pb-28 pt-5 motion-safe:animate-in motion-safe:fade-in lg:pb-0 lg:pt-8">
      <AppNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          // The bottom bar always opens a fresh form; "Log this" sets a drink.
          setLogDraft(null);
          changeTab(tab);
        }}
      />

      {/* Where you are: region name, and the 2:1 thumbnail with your dot */}
      <div className="flex items-center justify-between gap-4">
        {hasCoordinate ? (
          <div className="flex flex-col gap-1">
            <span className="label-caps">{menu.youAreIn}</span>
            <span className="font-serif text-2xl italic leading-none text-primary">{region.name}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartOver}
            className="flex min-h-11 items-center font-serif text-lg italic text-foreground underline decoration-primary underline-offset-4 hover:text-primary"
          >
            {hero.primaryCta}
          </button>
        )}
        {hasCoordinate && <MapThumb x={user.x} y={user.y} />}
      </div>

      {activeTab === 'menu' && (
        <div className="motion-safe:animate-in motion-safe:fade-in">
          {top ? (
            <>
              <TopPick drink={top} entry={register[top.name]} user={user} />
              <ol className="mt-5.5 border-t border-foreground">
                {rest.map((d, i) => (
                  <li key={d.name} className="dot-leader border-b border-border py-3">
                    <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">
                      {i + 2}
                    </span>
                    <DrinkName name={d.name} entry={register[d.name]} className="text-prose" />
                    <span aria-hidden="true" className="leader" />
                    <span className="font-condensed text-ui font-semibold tabular-nums" aria-label={`Closeness ${d.score}`}>
                      {d.score}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-6 font-serif text-prose italic text-muted-foreground">{menu.empty}</p>
          )}

          {/* One sign-in prompt, below the list, stating the benefit */}
          {isEnabled && !isConnected && (
            <div className="mt-5 flex items-center gap-3 border border-border bg-card p-4">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-serif text-base font-bold">{menu.keepTitle}</span>
                <span className="text-meta text-muted-foreground">{menu.keepBody}</span>
              </div>
              <button
                type="button"
                onClick={onRequestSignIn}
                className="min-h-11 shrink-0 border border-foreground bg-secondary px-3.5 font-condensed text-xs font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {nav.signIn}
              </button>
            </div>
          )}

          {isConnected && (
            <MemberTools
              user={user}
              vibeTags={vibeTags || {}}
              handle={handle}
              topName={top ? displayName(top.name) : ''}
              regionName={region.name}
              onPalateUpdated={onPalateUpdated}
              onSignOut={disconnect}
            />
          )}

          <div className="mt-10 border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={onStartOver}
              className="min-h-11 px-4 font-condensed text-meta uppercase tracking-label text-muted-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary"
            >
              {menu.startOver}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="mt-4.5 motion-safe:animate-in motion-safe:fade-in">
          <MapTab
            you={hasCoordinate ? { x: user.x, y: user.y } : null}
            menu={goTo.map((d) => d.name)}
            closeness={closeness}
            pours={history}
            register={register}
            onLog={(drinkName) => {
              setLogDraft(drinkName);
              changeTab('log');
            }}
          />
        </div>
      )}

      {activeTab === 'log' && (
        <div className="mt-8 space-y-10 motion-safe:animate-in motion-safe:fade-in">
          <section>
            <h2 className="mb-4 border-b border-foreground pb-1.5 font-serif text-xl font-bold">{returnVisit.logTitle}</h2>
            <PourForm
              key={logDraft ?? 'menu'}
              suggestions={goTo.map((d) => d.name)}
              labelFor={displayName}
              initialDrink={logDraft ?? goTo[0]?.name}
              venue={selectedLocation ?? ''}
              onVenueChange={(v) => setSelectedLocation(v || null)}
              recentVenues={recentVenues.filter((v) => v !== 'Home Pour')}
              isMember={isConnected}
              submitting={logging}
              error={logError}
              onSubmit={handleLog}
              submitSlot={
                isConnected ? undefined : (
                  <button
                    type="button"
                    onClick={onRequestSignIn}
                    className="min-h-13 w-full border border-foreground bg-secondary font-condensed text-sm font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {pour.signInToLog}
                  </button>
                )
              }
            />
          </section>
          {isConnected && (
            <section>
              <h2 className="mb-1 font-serif text-xl font-bold">{returnVisit.ledgerTitle}</h2>
              <PourLedger pours={history} register={register} empty={returnVisit.ledgerEmpty} loading={loadingHistory} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DrinkName({
  name,
  entry,
  className,
}: {
  name: string;
  entry?: Register[string];
  className?: string;
}) {
  const label = entry?.title ?? name;
  const classes = cn('font-serif font-bold text-foreground', className);
  return entry ? (
    <a href={`/drinks/${entry.slug}`} className={cn(classes, 'transition-colors hover:text-primary')}>
      {label}
    </a>
  ) : (
    <span className={classes}>{label}</span>
  );
}

/**
 * The top pick: the one sheet that is yours, so it takes the letterpress
 * offset. The explanation is written once, here, rather than on tap for every
 * row.
 */
function TopPick({
  drink,
  entry,
  user,
}: {
  drink: ScoredDrink;
  entry?: Register[string];
  user: User;
}) {
  const [why, setWhy] = useState<{ name: string; text: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    explainDrinkMatch(drink.name, {
      x: user.x,
      y: user.y,
      dislikesSmoke: user.filters.includes('noSmoke'),
      dislikesBitter: user.filters.includes('noBitter'),
    })
      .then((text) => !cancelled && setWhy({ name: drink.name, text }))
      .catch(() => !cancelled && setWhy({ name: drink.name, text: null }));
    return () => {
      cancelled = true;
    };
  }, [drink.name, user.x, user.y, user.filters]);

  const loading = why?.name !== drink.name;

  return (
    <div className="mt-5 flex flex-col gap-2.5 border border-foreground bg-card p-4.5 shadow-mcm">
      <div className="flex items-baseline justify-between">
        <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
          {menu.topPrefix} · {menu.topTitle}
        </span>
        <span className="font-condensed text-base font-bold tabular-nums" aria-label={`Closeness ${drink.score}`}>
          {drink.score}
        </span>
      </div>
      <DrinkName name={drink.name} entry={entry} className="text-title" />
      {entry?.build && <span className="text-sm text-muted-foreground">{entry.build}</span>}
      {(loading || why?.text) && (
        <p
          aria-busy={loading}
          className={cn(
            'border-t border-border pt-2.5 font-serif text-ui italic',
            loading && 'text-muted-foreground motion-safe:animate-pulse'
          )}
        >
          {loading ? '…' : why?.text}
        </p>
      )}
    </div>
  );
}

/** For signed-in members: who you are, sharing, and "tell us what you avoid". */
function MemberTools({
  user,
  vibeTags,
  handle,
  topName,
  regionName,
  onPalateUpdated,
  onSignOut,
}: {
  user: User;
  vibeTags: Record<string, number>;
  handle: string | null;
  topName: string;
  regionName: string;
  onPalateUpdated?: (profile: UserProfile) => void;
  onSignOut: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [refining, setRefining] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);

  const refine = async () => {
    if (notes.trim().length < 2 || refining) return;
    setRefining(true);
    try {
      const response = await refinePalateWithAI(notes, {
        x: user.x,
        y: user.y,
        dislikesSmoke: user.filters.includes('noSmoke'),
        dislikesBitter: user.filters.includes('noBitter'),
        dislikesAnise: user.filters.includes('noAnise'),
        vibeTags,
      });
      setResult(response.dossier);
      onPalateUpdated?.(response.profile);
    } catch (err) {
      console.error('Failed to refine palate:', err);
    } finally {
      setRefining(false);
    }
  };

  const share = async () => {
    setShareState('sharing');
    setShareError(null);
    const response = await sharePalateToFeed(topName, regionName);
    if (response.success) {
      setShareState('shared');
    } else {
      setShareState('idle');
      setShareError(response.error || 'That did not go through. Try again.');
    }
  };

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-border py-2">
        <span className="mr-auto text-meta text-muted-foreground">
          {menu.signedInAs} <span className="font-bold text-foreground">@{handle}</span>
        </span>
        {handle && (
          <a
            href={publicMapPath(handle)}
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-secondary transition-colors hover:text-primary"
          >
            {publicMap.memberLink}
          </a>
        )}
        <button
          type="button"
          onClick={share}
          disabled={shareState !== 'idle'}
          className="min-h-11 font-condensed text-xs uppercase tracking-label text-secondary transition-colors hover:text-primary disabled:text-muted-foreground"
        >
          {shareState === 'shared' ? menu.shared : menu.share}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-11 font-condensed text-xs uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground"
        >
          {menu.signOut}
        </button>
        {shareError && (
          <p role="alert" className="w-full text-meta text-destructive">
            {shareError}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{menu.refineTitle}</h2>
        <p className="text-ui text-muted-foreground">{menu.refineBody}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={menu.refinePlaceholder}
          rows={3}
          aria-label={menu.refineTitle}
          className="w-full resize-none rounded-sm border border-border bg-card p-3.5 font-body text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={refine}
          disabled={refining || notes.trim().length < 2}
          className="min-h-12 border border-foreground bg-transparent px-6 font-condensed text-meta font-semibold uppercase tracking-label text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
        >
          {refining ? menu.refining : menu.refineSubmit}
        </button>
        {result && (
          <div className="border-l-2 border-primary pl-4">
            <span className="label-caps text-primary">{menu.refineResult}</span>
            <p className="mt-1 font-serif text-ui italic">{result}</p>
          </div>
        )}
      </section>
    </div>
  );
}
