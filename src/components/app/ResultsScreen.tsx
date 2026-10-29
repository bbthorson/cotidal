import { useMemo, useState, useEffect, useCallback } from 'react';
import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { calculateWeightedRelevance } from '@/lib/scoring';
import { quadrantFor } from '@/lib/quadrant';
import { menu, nav } from '@/lib/copy';
import { logPathFor } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import { Chart, DrinkCard, DrinkRow, PouredList, useLastPours, type Lens } from './Chart';
import { useAtprotoContext } from './AtprotoProvider';
import { OpenOrder } from './OpenOrder';
import { AccountTools } from './AccountTools';
import { explainDrinkMatch, getConnectedPours } from '@/lib/api-client';
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
  const { isEnabled, isConnected } = useAtprotoContext();
  const [lens, setLens] = useState<Lens>('drinks');
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<PourRecord[]>([]);
  const lastPour = useLastPours(history);

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
      <OpenOrder displayName={displayName} />

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

      {/* The account lives on Log now; here, only starting over. */}
      <AccountTools handle={null} topName="" regionName={region.name} onStartOver={onStartOver} />

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
