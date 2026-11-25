import { useMemo, type ReactNode } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatCoordinate } from '@/lib/coordinate';
import { chart, pour } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { cn } from '@/lib/utils';
import { CoordinateMap, DrinkSpot, YouMark } from './CoordinateMap';
import { PinnedCard } from './PinnedCard';


interface Spot {
  key: string;
  x: number;
  y: number;
  drinks: Drink[];
}

const key = (d: { x: number; y: number }) => `${d.x},${d.y}`;

/**
 * Compass's chart: every drink at its coordinate, with you as the point they
 * are measured from, and a legend under the frame the way a chart carries
 * its key in a cartouche. It is about the drinks: your track, the shoal and
 * your pours are Your map's (`YourChart`). Tapping a mark selects the drink;
 * the screen opens it in `DrinkCard`.
 */
export function Chart({
  you,
  menuNames,
  selected,
  onSelect,
  register,
  bare = false,
}: {
  you: { x: number; y: number } | null;
  menuNames: string[];
  selected: string | null;
  onSelect: (drinkName: string) => void;
  register: Register;
  /** The map alone, without its legend: before you have a position, the screen says the rest. */
  bare?: boolean;
}) {
  const name = (n: string) => titleOf(register, n);
  const region = you ? quadrantFor(you.x, you.y) : null;

  const spots = useMemo(() => {
    const byKey = new Map<string, Spot>();
    for (const d of drinkDatabase) {
      const k = key(d);
      const spot = byKey.get(k) ?? { key: k, x: d.x, y: d.y, drinks: [] };
      spot.drinks.push(d);
      byKey.set(k, spot);
    }
    return [...byKey.values()];
  }, []);

  return (
    <section aria-label={chart.label}>
      <CoordinateMap you={you ?? undefined} showAxes graticule>
        {spots.map((spot) => (
          <DrinkSpot
            key={spot.key}
            x={spot.x}
            y={spot.y}
            variant={spot.drinks.some((d) => menuNames.includes(d.name)) ? 'filled' : 'hollow'}
            selected={spot.drinks.some((d) => d.name === selected)}
            label={spot.drinks.map((d) => name(d.name)).join(', ')}
            onSelect={() => onSelect(spot.drinks[0].name)}
          />
        ))}
        {you && region && <YouMark x={you.x} y={you.y} label={chart.youIn(region.name)} />}
      </CoordinateMap>

      {/* The legend: the frame continues around it. */}
      {!bare && (
        <ul className="flex flex-wrap gap-x-3.5 gap-y-0.5 border-x border-b border-foreground bg-card px-3.5 py-2.5">
          {you && <LegendItem mark="you">{chart.legendYou}</LegendItem>}
          <LegendItem mark="filled">{chart.legendMenu}</LegendItem>
          <LegendItem mark="hollow">{chart.legendElsewhere}</LegendItem>
        </ul>
      )}
    </section>
  );
}

/** One entry in a chart's legend: the mark as it is drawn, and what it means. */
export function LegendItem({
  mark,
  children,
}: {
  mark: 'you' | 'filled' | 'hollow' | 'track' | 'shoal';
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5 text-meta text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          mark === 'track'
            ? 'h-0.5 w-3 bg-primary'
            : mark === 'shoal'
              ? 'h-2 w-2 rounded-full border border-dashed border-secondary bg-shoal'
              : mark === 'you'
                ? 'h-2 w-2 rounded-full bg-primary'
                : cn('h-1.75 w-1.75 rounded-full border border-foreground', mark === 'filled' ? 'bg-foreground' : 'bg-card')
        )}
      />
      {children}
    </li>
  );
}

/**
 * A row of a list under the chart: the whole row selects the drink. A figure
 * (how far) sits at the end on a dot leader; a note (what put a drink on your
 * menu) sits under the name instead.
 */
export function DrinkRow({
  rank,
  title,
  figure,
  figureLabel,
  note,
  selected,
  onSelect,
}: {
  rank?: number;
  title: string;
  figure?: string | number;
  figureLabel?: string;
  note?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  if (note !== undefined) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left focus-ring-inset"
      >
        {rank !== undefined && (
          <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{rank}</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
              selected ? 'text-primary' : 'text-foreground'
            )}
          >
            {title}
          </span>
          <span className="text-meta text-muted-foreground">{note}</span>
        </span>
      </button>
    );
  }
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
          'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
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
  distance,
  last,
  sameSpot,
  onPick,
  onLog,
  onChoose,
  onClose,
}: {
  drink: Drink;
  register: Register;
  /** How far it sits from you, as the menu says it. */
  distance?: number;
  last?: PourRecord;
  sameSpot: Drink[];
  onPick: (name: string) => void;
  onLog: () => void;
  /** Keep this as the pick, waiting to be rated. Absent where picking is not offered. */
  onChoose?: () => void;
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

      {(distance !== undefined || lastLine) && (
        <dl className="border-t border-border pt-1">
          {distance !== undefined && (
            <div className="dot-leader py-1.5">
              <dt className="text-meta text-muted-foreground">{chart.howFar}</dt>
              <span aria-hidden="true" className="leader" />
              <dd className="font-condensed text-ui font-bold tabular-nums">{distance}</dd>
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
        {onChoose && (
          <button type="button" onClick={onChoose} className="btn btn-primary px-5">
            {chart.pickThis}
          </button>
        )}
        <button type="button" onClick={onLog} className={onChoose ? 'btn btn-outline px-5' : 'btn btn-primary px-5'}>
          {chart.logThis}
        </button>
        {entry && (
          <a
            href={`/drinks/${entry.slug}`}
            className="link-caps text-secondary hover:underline"
          >
            {chart.readEntry} &rarr;
          </a>
        )}
      </div>
    </PinnedCard>
  );
}
