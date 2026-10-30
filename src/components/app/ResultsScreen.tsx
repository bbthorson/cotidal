import { useMemo, useState, useEffect, useCallback } from 'react';
import { drinkDatabase, type User } from '@/lib/data';
import { chart, compass, menu, nav } from '@/lib/copy';
import { harbourAt, logPathFor } from '@/lib/site-nav';
import { titleOf, type Register } from '@/lib/register';
import { usePours } from '@/hooks/usePours';
import { useMenu, type ScoredDrink } from '@/hooks/useMenu';
import { DrinkCard, DrinkRow, useLastPours } from './Chart';
import { useAtprotoContext } from './AtprotoProvider';
import { WaitingPick } from './WaitingPick';
import { BarCard, BarRows, NearPanel, useNearby } from './Near';
import { metresBetween } from '@/lib/osm';
import { readGeo } from '@/lib/atproto/location';
import { explainDrinkMatch } from '@/lib/api-client';
import { barsFromPours, foldName, type BarVisits } from '@/lib/pour-history';
import { cn } from '@/lib/utils';

interface ResultsScreenProps {
  user: User;
  /** False when browsing without having answered the questions. */
  hasCoordinate: boolean;
  vibeTags?: Record<string, number>;
  register: Register;
  onRequestSignIn: () => void;
  onStartOver: () => void;
}

/**
 * Compass: finding something — a drink, a bar — rather than looking at
 * yourself, which is Log's (and where the map now lives). One search over
 * both. With nothing typed it points the way: your top pick, the drinks
 * closest to your taste, and the bars you have poured at. A drink opens in
 * the card; a bar opens the harbour already there.
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
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedBar, setSelectedBar] = useState<string | null>(null);
  const nearby = useNearby();
  const { pours } = usePours(isConnected);
  const history = useMemo(() => pours ?? [], [pours]);
  const lastPour = useLastPours(history);
  const { scored, menu: goTo, closeness } = useMenu(user, vibeTags, history);

  const displayName = useCallback((name: string) => titleOf(register, name), [register]);

  const bars = useMemo(() => barsFromPours(history), [history]);

  // Which bars on the map you have poured at, and how often: by name, or by
  // where the pour said the bar was (a pour picked from this map records it).
  const pouredAt = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of nearby.bars) {
      const n = history.filter((p) => {
        if (p.isHomePour || !p.venue) return false;
        const at = readGeo(p.venue.address);
        return foldName(p.venue.entity.name) === foldName(b.name) || (at !== null && metresBetween(at, b) < 60);
      }).length;
      if (n > 0) counts.set(b.id, n);
    }
    return counts;
  }, [nearby.bars, history]);
  const known = useMemo(() => new Set(pouredAt.keys()), [pouredAt]);
  const openBar = selectedBar ? nearby.bars.find((b) => b.id === selectedBar) ?? null : null;
  const chooseBar = (id: string) => {
    setSelected(null);
    setSelectedBar((cur) => (cur === id ? null : id));
  };

  const q = foldName(query);
  // A drink matches by its name or by what is in it ("mezcal", "lime").
  const drinkHits = useMemo(
    () =>
      q
        ? scored.filter((d) => foldName(titleOf(register, d.name)).includes(q) || foldName(register[d.name]?.build ?? '').includes(q))
        : [],
    [q, scored, register]
  );
  const barHits = q ? bars.filter((b) => foldName(b.name).includes(q)) : bars;
  const nearHits = q ? nearby.bars.filter((b) => foldName(b.name).includes(q)) : [];

  const top = goTo[0];
  const rest = goTo.slice(1);

  const choose = (drinkName: string) => {
    setSelectedBar(null);
    setSelected((s) => (s === drinkName ? null : drinkName));
  };
  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;

  return (
    <div
      className={cn(
        'mx-auto max-w-xl pb-6 pt-4 motion-safe:animate-in motion-safe:fade-in lg:pt-8',
        // Room to scroll the foot of the page out from under the card.
        (selectedDrink || openBar) && 'pb-80'
      )}
    >
      <h1 className="sr-only">{compass.title}</h1>
      <WaitingPick displayName={displayName} />

      {!hasCoordinate && (
        <button
          type="button"
          onClick={onStartOver}
          className="mb-4 flex min-h-11 items-center font-serif text-lg italic text-foreground underline decoration-primary underline-offset-4 hover:text-primary"
        >
          {compass.findYours}
        </button>
      )}

      <search className="mb-4 flex">
        <label className="flex flex-1 flex-col">
          <span className="sr-only">{compass.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder={compass.placeholder}
            autoComplete="off"
            className="min-h-11 rounded-sm border border-foreground bg-card px-3 font-body text-ui text-foreground focus:border-primary focus:outline-none"
          />
        </label>
      </search>

      {q ? (
        <>
          <section className="mt-6">
            <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{compass.drinksTitle}</h2>
            {drinkHits.length === 0 ? (
              <p className="border-b border-border py-4 text-meta text-muted-foreground">{compass.noDrinks}</p>
            ) : (
              <ol>
                {drinkHits.slice(0, 20).map((d) => (
                  <li key={d.name} className="border-b border-border">
                    <DrinkRow
                      title={displayName(d.name)}
                      figure={d.score}
                      figureLabel={chart.closenessOf(d.score)}
                      selected={selected === d.name}
                      onSelect={() => choose(d.name)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
          <BarList
            title={compass.barsTitle}
            bars={barHits}
            // Not a bar you have been to: the harbour starts there all the same.
            extra={barHits.some((b) => foldName(b.name) === q) || nearHits.some((b) => foldName(b.name) === q) ? null : query.trim()}
          />
          {nearHits.length > 0 && (
            <section className="mt-6">
              <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{compass.nearTitle}</h2>
              <BarRows bars={nearHits} known={known} selected={selectedBar} onSelect={chooseBar} />
            </section>
          )}
        </>
      ) : (
        <>
          {/* The first view is the map: where you are, and what is around you. */}
          <NearPanel nearby={nearby} known={known} selected={selectedBar} onSelect={chooseBar} />
          {top ? (
            <>
              <TopPick drink={top} entry={register[top.name]} user={user} selected={selected === top.name} onSelect={() => choose(top.name)} />
              <ol className="mt-5.5 border-t border-foreground">
                {rest.map((d, i) => (
                  <li key={d.name} className="border-b border-border">
                    <DrinkRow
                      rank={i + 2}
                      title={displayName(d.name)}
                      figure={d.score}
                      figureLabel={chart.closenessOf(d.score)}
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
          {bars.length > 0 && <BarList title={compass.yourBars} bars={bars} extra={null} />}
        </>
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

      {openBar && <BarCard bar={openBar} poured={pouredAt.get(openBar.id) ?? 0} onClose={() => setSelectedBar(null)} />}

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

/** Bars: each opens the harbour already there, to pick a drink. */
function BarList({ title, bars, extra }: { title: string; bars: BarVisits[]; extra: string | null }) {
  if (bars.length === 0 && !extra) return null;
  return (
    <section className="mt-6">
      <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{title}</h2>
      <ol>
        {bars.map((b) => (
          <li key={b.name} className="border-b border-border">
            <a href={harbourAt(b.name)} className="dot-leader min-h-11 w-full py-3 focus-ring-inset">
              <span className="font-serif text-prose font-bold text-foreground transition-colors hover:text-primary">{b.name}</span>
              <span aria-hidden="true" className="leader" />
              <span className="shrink-0 font-condensed text-meta uppercase tracking-label text-muted-foreground">
                {compass.barPours(b.pours)}
              </span>
            </a>
          </li>
        ))}
        {extra && (
          <li className="border-b border-border">
            <a
              href={harbourAt(extra)}
              className="flex min-h-11 items-center py-3 font-condensed text-xs uppercase tracking-label text-secondary hover:text-primary focus-ring-inset"
            >
              {compass.pickAt(extra)} &rarr;
            </a>
          </li>
        )}
      </ol>
    </section>
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
        <span className="font-condensed text-base font-bold tabular-nums" aria-label={chart.closenessOf(drink.score)}>
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
