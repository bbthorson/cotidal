import { useMemo, useState, useEffect, useCallback } from 'react';
import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { calculateWeightedRelevance } from '@/lib/scoring';
import { quadrantFor } from '@/lib/quadrant';
import { account, harbour, menu, nav, publicMap } from '@/lib/copy';
import { clearOpenOrder, loadOpenOrder, type OpenOrder } from '@/lib/device-store';
import { draftPath } from '@/lib/pour-draft';
import { publicMapPath } from '@/lib/atproto/paths';
import { accountHref, logPathFor } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import { Chart, DrinkCard, DrinkRow, PouredList, useLastPours, type Lens } from './Chart';
import { useAtprotoContext } from './AtprotoProvider';
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
 * The chart, and your menu under it: one screen. It was two tabs, Menu and
 * Map, which mostly repeated each other (a top eight, and the nearest eight)
 * and each re-stated where you are. Now the map is the one large move, its
 * title block says where you are, and the menu is the list beneath it. A
 * drink tapped anywhere — a mark, the top pick, a row — opens in one card.
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
  const [lens, setLens] = useState<Lens>('drinks');
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<PourRecord[]>([]);
  const lastPour = useLastPours(history);
  // An order from the harbour, waiting to be rated. Read after mount: it is on the device.
  const [openOrder, setOpenOrder] = useState<OpenOrder | null>(null);
  useEffect(() => setOpenOrder(loadOpenOrder()), []);

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

  const top = goTo[0];
  const rest = goTo.slice(1);

  const choose = (drinkName: string) => setSelected((s) => (s === drinkName ? null : drinkName));
  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;
  const offMap = history.filter(
    (p) => !drinkDatabase.some((d) => d.name.toLowerCase() === p.drink.name.toLowerCase())
  ).length;

  return (
    <div
      className={cn(
        'mx-auto max-w-xl pb-6 pt-4 motion-safe:animate-in motion-safe:fade-in lg:pt-8',
        // Room to scroll the foot of the page out from under the card.
        selectedDrink && 'pb-80'
      )}
    >
      {openOrder && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border border-foreground bg-card px-4 py-2">
          <div className="mr-auto flex min-w-0 flex-col">
            <span className="label-caps">{harbour.waiting}</span>
            <span className="truncate font-serif text-base font-bold text-foreground">
              {displayName(openOrder.drink)}
              {(openOrder.bar || openOrder.atHome) && (
                <span className="font-normal italic text-muted-foreground">
                  {' '}
                  · {openOrder.atHome ? harbour.atHome : openOrder.bar}
                </span>
              )}
            </span>
          </div>
          <a
            href={draftPath({ drink: openOrder.drink, atHome: openOrder.atHome, bar: openOrder.bar })}
            className="btn btn-primary px-4"
          >
            {harbour.rate}
          </a>
          <button
            type="button"
            onClick={() => {
              clearOpenOrder();
              setOpenOrder(null);
            }}
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground"
          >
            {harbour.dismiss}
          </button>
        </div>
      )}

      <Chart
        you={hasCoordinate ? { x: user.x, y: user.y } : null}
        menuNames={goTo.map((d) => d.name)}
        lastPour={lastPour}
        lens={lens}
        onLens={(l) => {
          setLens(l);
          setSelected(null);
        }}
        selected={selected}
        onSelect={choose}
        register={register}
        onTakeQuiz={onStartOver}
      />

      {lens === 'pours' ? (
        <PouredList lastPour={lastPour} offMap={offMap} selected={selected} onSelect={choose} register={register} />
      ) : top ? (
        <>
          <TopPick drink={top} entry={register[top.name]} user={user} selected={selected === top.name} onSelect={() => choose(top.name)} />
          <ol className="mt-5.5 border-t border-foreground">
            {rest.map((d, i) => (
              <li key={d.name} className="border-b border-border">
                <DrinkRow
                  rank={i + 2}
                  title={displayName(d.name)}
                  figure={d.score}
                  figureLabel={`Closeness ${d.score}`}
                  selected={selected === d.name}
                  onSelect={() => choose(d.name)}
                />
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
          <button type="button" onClick={onRequestSignIn} className="btn btn-primary shrink-0 px-3.5">
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

      {selectedDrink && (
        <DrinkCard
          drink={selectedDrink}
          register={register}
          closeness={closeness[selectedDrink.name]}
          last={lastPour.get(selectedDrink.name)}
          sameSpot={drinkDatabase.filter(
            (d) => d.name !== selectedDrink.name && d.x === selectedDrink.x && d.y === selectedDrink.y
          )}
          onPick={setSelected}
          onLog={() => window.location.assign(logPathFor(selectedDrink.name))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
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
  selected,
  onSelect,
}: {
  drink: ScoredDrink;
  entry?: Register[string];
  user: User;
  selected: boolean;
  onSelect: () => void;
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
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'text-left font-serif text-title font-bold transition-colors hover:text-primary',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {entry?.title ?? drink.name}
      </button>
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
