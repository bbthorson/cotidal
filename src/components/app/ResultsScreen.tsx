import { useMemo, useState, useEffect, useCallback } from 'react';
import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { calculateWeightedRelevance } from '@/lib/scoring';
import { quadrantFor } from '@/lib/quadrant';
import { account, hero, menu, nav, publicMap } from '@/lib/copy';
import { publicMapPath } from '@/lib/atproto/paths';
import { accountHref, logPathFor } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import { MapTab } from './MapTab';
import { AppNavigation, type ActiveTab } from './AppNavigation';
import { useAtprotoContext } from './AtprotoProvider';
import { MapThumb } from './CoordinateMap';
import {
  explainDrinkMatch,
  getConnectedPours,
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
  const { isEnabled, isConnected, handle } = useAtprotoContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [history, setHistory] = useState<PourRecord[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!isConnected) return;
    try {
      setHistory(await getConnectedPours(50));
    } catch (e) {
      console.error('Failed to load tasted history:', e);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
          // No venue chosen on this page: the venue term is for /log's form.
          null
        ),
      }));
  }, [user, vibeTags, history]);

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
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const top = goTo[0];
  const rest = goTo.slice(1);

  return (
    <div className="mx-auto max-w-xl pb-6 pt-5 motion-safe:animate-in motion-safe:fade-in lg:pb-0 lg:pt-8">
      <AppNavigation
        activeTab={activeTab}
        onTabChange={changeTab}
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
            />
          )}

          <StartOver onConfirm={onStartOver} />
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
            onLog={(drinkName) => window.location.assign(logPathFor(drinkName))}
          />
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
}: {
  user: User;
  vibeTags: Record<string, number>;
  handle: string | null;
  topName: string;
  regionName: string;
  onPalateUpdated?: (profile: UserProfile) => void;
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
        {/* Sign out lives in the header and on /account: a form post, no script needed. */}
        <a
          href={accountHref}
          className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground"
        >
          {nav.account}
        </a>
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

/**
 * Start over, in two steps: the first says what it does, the second does it.
 * A coordinate built from a quiz and a ledger of pours is not something to
 * lose to a stray tap. The words are /account's, so the two cannot disagree.
 */
function StartOver({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const quiet =
    'min-h-11 px-4 font-condensed text-meta uppercase tracking-label text-muted-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary';

  return (
    <div className="mt-10 border-t border-border pt-4 text-center">
      {confirming ? (
        <div role="group" aria-label={menu.startOver} className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <p className="text-ui text-muted-foreground">{account.startOverBody}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 border border-foreground bg-secondary px-4 font-condensed text-xs font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {account.startOverCta}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={quiet}>
              {menu.startOverCancel}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={quiet}>
          {menu.startOver}
        </button>
      )}
    </div>
  );
}
