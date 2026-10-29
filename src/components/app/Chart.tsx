import { useMemo } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatCoordinate } from '@/lib/coordinate';
import { chart, menu, pour } from '@/lib/copy';
import type { Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { cn } from '@/lib/utils';
import { CoordinateMap, DrinkSpot, YouMark } from './CoordinateMap';

export type Lens = (typeof chart.lenses)[number]['id'];

interface Spot {
  key: string;
  x: number;
  y: number;
  drinks: Drink[];
}

const key = (d: { x: number; y: number }) => `${d.x},${d.y}`;

/** The latest pour of each drink on the map, by catalogue name. */
export function useLastPours(pours: PourRecord[]) {
  return useMemo(() => {
    const byName = new Map<string, PourRecord>();
    for (const p of pours) {
      const drink = drinkDatabase.find((d) => d.name.toLowerCase() === p.drink.name.toLowerCase());
      if (!drink) continue;
      const prev = byName.get(drink.name);
      if (!prev || new Date(p.createdAt) > new Date(prev.createdAt)) byName.set(drink.name, p);
    }
    return byName;
  }, [pours]);
}

/**
 * The chart: every drink at its coordinate, your position, and a title block
 * under the frame — where you are and what the marks mean — the way a chart
 * carries its title and legend in a cartouche rather than on loose lines
 * around it. Two readings: the drinks (your menu filled), or your pours.
 * Tapping a mark selects the drink; the screen opens it in `DrinkCard`.
 */
export function Chart({
  you,
  menuNames,
  lastPour,
  lens,
  onLens,
  selected,
  onSelect,
  register,
  onTakeQuiz,
}: {
  you: { x: number; y: number } | null;
  menuNames: string[];
  lastPour: Map<string, PourRecord>;
  lens: Lens;
  onLens: (lens: Lens) => void;
  selected: string | null;
  onSelect: (drinkName: string) => void;
  register: Register;
  /** Shown in place of the position when there is none yet. */
  onTakeQuiz: () => void;
}) {
  const name = (n: string) => register[n]?.title ?? n;
  const region = you ? quadrantFor(you.x, you.y) : null;

  const spots = useMemo(() => {
    const visible = lens === 'pours' ? drinkDatabase.filter((d) => lastPour.has(d.name)) : drinkDatabase;
    const byKey = new Map<string, Spot>();
    for (const d of visible) {
      const k = key(d);
      const spot = byKey.get(k) ?? { key: k, x: d.x, y: d.y, drinks: [] };
      spot.drinks.push(d);
      byKey.set(k, spot);
    }
    return [...byKey.values()];
  }, [lens, lastPour]);

  const variantFor = (spot: Spot): 'filled' | 'hollow' | 'muted' => {
    if (lens === 'pours') {
      const best = Math.max(...spot.drinks.map((d) => lastPour.get(d.name)?.rating.hedonic ?? 0));
      return best >= 7 ? 'filled' : best <= 4 ? 'muted' : 'hollow';
    }
    return spot.drinks.some((d) => menuNames.includes(d.name)) ? 'filled' : 'hollow';
  };

  const legend =
    lens === 'pours'
      ? [
          { variant: 'filled', label: chart.legendLiked },
          { variant: 'hollow', label: pour.hedonic[4] },
          { variant: 'muted', label: chart.legendNot },
        ]
      : [
          { variant: 'filled', label: chart.legendMenu },
          { variant: 'hollow', label: chart.legendElsewhere },
        ];

  return (
    <section aria-label={chart.label}>
      <CoordinateMap you={you ?? undefined} showAxes graticule>
        {spots.map((spot) => (
          <DrinkSpot
            key={spot.key}
            x={spot.x}
            y={spot.y}
            variant={variantFor(spot)}
            selected={spot.drinks.some((d) => d.name === selected)}
            label={spot.drinks.map((d) => name(d.name)).join(', ')}
            onSelect={() => onSelect(spot.drinks[0].name)}
          />
        ))}
        {you && region && <YouMark x={you.x} y={you.y} label={`Your coordinate, in ${region.name}`} />}
      </CoordinateMap>

      {/* The title block: the frame continues around it. */}
      <div className="flex items-start justify-between gap-4 border-x border-b border-foreground bg-card px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          {you && region ? (
            <>
              <span className="label-caps">{menu.youAreIn}</span>
              <span className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-serif text-2xl italic leading-none text-primary">{region.name}</span>
                <span className="font-condensed text-xs font-semibold tabular-nums tracking-label text-secondary">
                  {formatCoordinate(you.x, you.y)}
                </span>
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={onTakeQuiz}
              className="flex min-h-11 items-center text-left font-serif text-lg italic text-foreground underline decoration-primary underline-offset-4 hover:text-primary"
            >
              {chart.findYours}
            </button>
          )}
          <ul className="mt-1 flex flex-wrap gap-x-3.5 gap-y-0.5">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1.75 w-1.75 rounded-full border',
                    item.variant === 'filled'
                      ? 'border-foreground bg-foreground'
                      : item.variant === 'muted'
                        ? 'border-muted-foreground bg-muted'
                        : 'border-foreground bg-card'
                  )}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div role="group" aria-label={chart.lensLabel} className="flex shrink-0 flex-col border border-foreground">
          {chart.lenses.map((l, i) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={lens === l.id}
              onClick={() => onLens(l.id)}
              className={cn(
                'min-h-11 px-3 font-condensed text-xs font-semibold uppercase tracking-wider transition-colors focus-ring-inset',
                i > 0 && 'border-t border-foreground',
                lens === l.id ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground hover:bg-muted'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Your pours, newest first, scored as you scored them. */
export function PouredList({
  lastPour,
  offMap,
  selected,
  onSelect,
  register,
}: {
  lastPour: Map<string, PourRecord>;
  offMap: number;
  selected: string | null;
  onSelect: (drinkName: string) => void;
  register: Register;
}) {
  const rows = [...lastPour.entries()].sort(
    ([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return (
    <section className="mt-6">
      <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{chart.poured}</h2>
      {rows.length === 0 ? (
        <p className="border-b border-border py-6 font-serif text-prose italic text-muted-foreground">{chart.noPours}</p>
      ) : (
        <ol>
          {rows.map(([drinkName, p]) => (
            <li key={drinkName} className="border-b border-border">
              <DrinkRow
                title={register[drinkName]?.title ?? drinkName}
                figure={pour.scoreOf(p.rating.hedonic)}
                selected={selected === drinkName}
                onSelect={() => onSelect(drinkName)}
              />
            </li>
          ))}
        </ol>
      )}
      {offMap > 0 && <p className="mt-3 text-meta text-muted-foreground">{chart.offMap(offMap)}</p>}
    </section>
  );
}

/** A row of a list under the chart: the whole row selects the drink. */
export function DrinkRow({
  rank,
  title,
  figure,
  figureLabel,
  selected,
  onSelect,
}: {
  rank?: number;
  title: string;
  figure: string | number;
  figureLabel?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="dot-leader min-h-11 w-full py-3 text-left focus-ring-inset"
    >
      {rank !== undefined && (
        <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{rank}</span>
      )}
      <span
        className={cn(
          'font-serif text-prose font-bold transition-colors hover:text-primary',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {title}
      </span>
      <span aria-hidden="true" className="leader" />
      <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums" aria-label={figureLabel}>
        {figure}
      </span>
    </button>
  );
}

/**
 * A drink, opened: pinned above the app bar the way a maps app opens
 * a place, so nothing on the page moves and a row tapped at the foot of the
 * list is answered where the thumb is.
 */
export function DrinkCard({
  drink,
  register,
  closeness,
  last,
  sameSpot,
  onPick,
  onLog,
  onClose,
}: {
  drink: Drink;
  register: Register;
  closeness?: number;
  last?: PourRecord;
  sameSpot: Drink[];
  onPick: (name: string) => void;
  onLog: () => void;
  onClose: () => void;
}) {
  const entry = register[drink.name];
  const title = entry?.title ?? drink.name;
  const region = quadrantFor(drink.x, drink.y);
  const lastLine = last
    ? [
        pour.scoreOf(last.rating.hedonic),
        last.isHomePour ? pour.home : last.venue?.entity?.name,
        new Date(last.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div
      data-drink-card
      aria-live="polite"
      className="fixed inset-x-0 bottom-tabbar z-20 max-h-96 overflow-y-auto border-t border-foreground bg-card pb-4 shadow-bar lg:bottom-0 lg:pb-safe-b motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:mx-auto sm:max-w-xl sm:border-x"
    >
      <div className="flex flex-col gap-2 px-6 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
            {region.name} · {formatCoordinate(drink.x, drink.y)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="-my-2 -mr-2 flex min-h-11 items-center px-2 font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground"
          >
            {chart.close}
          </button>
        </div>
        <span className="font-serif text-2xl font-bold leading-tight text-foreground">{title}</span>
        {entry?.build && <span className="line-clamp-2 text-sm text-muted-foreground">{entry.build}</span>}

        {(closeness !== undefined || lastLine) && (
          <dl className="border-t border-border pt-1">
            {closeness !== undefined && (
              <div className="dot-leader py-1.5">
                <dt className="text-meta text-muted-foreground">{chart.closeness}</dt>
                <span aria-hidden="true" className="leader" />
                <dd className="font-condensed text-ui font-bold tabular-nums">{closeness}</dd>
              </div>
            )}
            {lastLine && (
              <div className="dot-leader py-1.5">
                <dt className="text-meta text-muted-foreground">{chart.lastPour}</dt>
                <span aria-hidden="true" className="leader" />
                <dd className="font-condensed text-ui font-semibold">{lastLine}</dd>
              </div>
            )}
          </dl>
        )}

        {sameSpot.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">{chart.sameSpot}</span>
            {sameSpot.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() => onPick(d.name)}
                className="min-h-9 border border-border px-2.5 font-condensed text-xs uppercase tracking-label text-secondary transition-colors hover:border-foreground"
              >
                {register[d.name]?.title ?? d.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={onLog} className="btn btn-primary px-5">
            {chart.logThis}
          </button>
          {entry && (
            <a
              href={`/drinks/${entry.slug}`}
              className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-primary hover:underline"
            >
              {chart.readEntry} &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
