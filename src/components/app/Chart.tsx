import { useMemo } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatCoordinate } from '@/lib/coordinate';
import { chart, menu, pour } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { cn } from '@/lib/utils';
import { CoordinateMap, DrinkSpot, YouMark } from './CoordinateMap';
import { PinnedCard } from './PinnedCard';

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
  eyebrow,
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
  /** Said before "You are in" — "On this device", for a guest. */
  eyebrow?: string;
}) {
  const name = (n: string) => titleOf(register, n);
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
        {you && region && <YouMark x={you.x} y={you.y} label={chart.youIn(region.name)} />}
      </CoordinateMap>

      {/* The title block: the frame continues around it. */}
      <div className="flex items-start justify-between gap-4 border-x border-b border-foreground bg-card px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          {you && region ? (
            <>
              <span className="label-caps">
                {eyebrow && `${eyebrow} · `}
                {menu.youAreIn}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-serif text-subtitle italic leading-none text-primary">{region.name}</span>
                <span className="font-condensed text-label font-semibold tabular-nums tracking-label text-secondary">
                  {formatCoordinate(you.x, you.y)}
                </span>
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={onTakeQuiz}
              className="link-serif flex min-h-11 items-center text-left text-plate"
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

        <div role="group" aria-label={chart.lensLabel} className="segmented segmented-stack flex shrink-0 flex-col">
          {chart.lenses.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={lens === l.id}
              onClick={() => onLens(l.id)}
              className="segment px-3"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
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
    <PinnedCard
      eyebrow={`${region.name} · ${formatCoordinate(drink.x, drink.y)}`}
      onClose={onClose}
      className="max-h-card overflow-y-auto"
    >
      <span className="font-serif text-subtitle font-bold leading-tight text-foreground">{title}</span>
      {entry?.build && <span className="line-clamp-2 text-meta text-muted-foreground">{entry.build}</span>}

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
          <span className="font-condensed text-label uppercase tracking-label text-muted-foreground">{chart.sameSpot}</span>
          {sameSpot.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => onPick(d.name)}
              className="chip"
            >
              {titleOf(register, d.name)}
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
            className="link-caps text-primary hover:underline"
          >
            {chart.readEntry} &rarr;
          </a>
        )}
      </div>
    </PinnedCard>
  );
}
