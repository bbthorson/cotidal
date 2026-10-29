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
  sharePalateToFeed,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PourRecord } from '@/lib/atproto/records';

interface ResultsScreenProps {
  user: User;
  /** False when browsing without having answered the questions. */
  hasCoordinate: boolean;
  vibeTags?: Record<string, number>;
  register: Register;
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
    <div className="mx-auto max-w-xl pb-6 pt-4 motion-safe:animate-in motion-safe:fade-in lg:pb-0 lg:pt-8">
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
                className="btn btn-primary shrink-0 px-3.5"
              >
                {nav.signIn}
              </button>
            </div>
          )}

          <MemberTools
            handle={isConnected ? handle : null}
            topName={top ? displayName(top.name) : ''}
            regionName={region.name}
            onStartOver={onStartOver}
          />
        </div>
      )}

      {activeTab === 'map' && (
        <div className="mt-4 motion-safe:animate-in motion-safe:fade-in">
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
    <div className="mt-4 flex flex-col gap-2.5 border border-foreground bg-card p-4.5 shadow-mcm">
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
            // Two lines held open while it loads, so the list below does not drop when it lands.
            'min-h-16 border-t border-border pt-2.5 font-serif text-ui italic',
            loading && 'text-muted-foreground motion-safe:animate-pulse'
          )}
        >
          {loading ? '…' : why?.text}
        </p>
      )}
    </div>
  );
}

/**
 * The foot of the menu, in one ruled-off block rather than three stacked
 * ones: who you are (a member), your public map, sharing, the account, and
 * start over. They were separate bands, each with its own rules and margin,
 * which on a phone read as a run of empty lines.
 */
function MemberTools({
  handle,
  topName,
  regionName,
  onStartOver,
}: {
  /** Null for a guest. */
  handle: string | null;
  topName: string;
  regionName: string;
  onStartOver: () => void;
}) {
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  const link = 'inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label transition-colors';

  return (
    <div className="mt-6">
      {handle && (
        <p className="text-meta text-muted-foreground">
          {menu.signedInAs} <span className="font-bold text-foreground">@{handle}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5">
        {handle && (
          <>
            <a href={publicMapPath(handle)} className={cn(link, 'text-secondary hover:text-primary')}>
              {publicMap.memberLink}
            </a>
            <button
              type="button"
              onClick={share}
              disabled={shareState !== 'idle'}
              className={cn(link, 'text-secondary hover:text-primary disabled:text-muted-foreground')}
            >
              {shareState === 'shared' ? menu.shared : menu.share}
            </button>
            {/* Sign out lives in the header and on /account: a form post, no script needed. */}
            <a href={accountHref} className={cn(link, 'text-muted-foreground hover:text-foreground')}>
              {nav.account}
            </a>
          </>
        )}
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(link, 'text-muted-foreground hover:text-primary')}
          >
            {menu.startOver}
          </button>
        )}
      </div>
      {shareError && (
        <p role="alert" className="text-meta text-destructive">
          {shareError}
        </p>
      )}
      {confirming && <StartOver onConfirm={onStartOver} onCancel={() => setConfirming(false)} />}
    </div>
  );
}

/**
 * Start over, in two steps: the link above says what it is, this does it.
 * A coordinate built from a quiz and a ledger of pours is not something to
 * lose to a stray tap. The words are /account's, so the two cannot disagree.
 */
function StartOver({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="group" aria-label={menu.startOver} className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-ui text-muted-foreground">{account.startOverBody}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={onConfirm} className="btn btn-primary px-4">
          {account.startOverCta}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground"
        >
          {menu.startOverCancel}
        </button>
      </div>
    </div>
  );
}
