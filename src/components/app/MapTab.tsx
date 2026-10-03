import { useMemo, useState } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { calculateDistance } from '@/lib/scoring';
import { formatCoordinate } from '@/lib/coordinate';
import { mapTab, pour } from '@/lib/copy';
import type { Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { cn } from '@/lib/utils';
import { CoordinateMap, DrinkSpot, YouMark } from './CoordinateMap';

type Lens = (typeof mapTab.lenses)[number]['id'];

interface MapTabProps {
  you: { x: number; y: number } | null;
  /** Your current menu, in order. */
  menu: string[];
  /** Closeness (0–100) for every drink still on offer, keyed by name. */
  closeness: Record<string, number>;
  pours: PourRecord[];
  register: Register;
  onLog: (drinkName: string) => void;
}

interface Spot {
  key: string;
  x: number;
  y: number;
  drinks: Drink[];
}

const NEAREST_COUNT = 8;
const key = (d: { x: number; y: number }) => `${d.x},${d.y}`;

/**
 * The Map tab: every drink at its coordinate, with three readings of the same
 * square — everything, your menu, what you've poured. Tap a dot (or a row
 * in the list below) and the drink opens under the map, with "Log this".
 */
export function MapTab({ you, menu, closeness, pours, register, onLog }: MapTabProps) {
  const [lens, setLens] = useState<Lens>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const name = (n: string) => register[n]?.title ?? n;

  // The latest pour of each drink, by catalogue name.
  const lastPour = useMemo(() => {
    const byName = new Map<string, PourRecord>();
    for (const p of pours) {
      const drink = drinkDatabase.find((d) => d.name.toLowerCase() === p.drink.name.toLowerCase());
      if (!drink) continue;
      const prev = byName.get(drink.name);
      if (!prev || new Date(p.createdAt) > new Date(prev.createdAt)) byName.set(drink.name, p);
    }
    return byName;
  }, [pours]);

  const offMap = pours.filter(
    (p) => !drinkDatabase.some((d) => d.name.toLowerCase() === p.drink.name.toLowerCase())
  ).length;

  const visible = useMemo(() => {
    if (lens === 'menu') return drinkDatabase.filter((d) => menu.includes(d.name));
    if (lens === 'pours') return drinkDatabase.filter((d) => lastPour.has(d.name));
    return drinkDatabase;
  }, [lens, menu, lastPour]);

  const spots = useMemo(() => {
    const byKey = new Map<string, Spot>();
    for (const d of visible) {
      const k = key(d);
      const spot = byKey.get(k) ?? { key: k, x: d.x, y: d.y, drinks: [] };
      spot.drinks.push(d);
      byKey.set(k, spot);
    }
    return [...byKey.values()];
  }, [visible]);

  const ordered = useMemo(() => {
    if (lens === 'menu') return menu.map((n) => drinkDatabase.find((d) => d.name === n)).filter((d): d is Drink => !!d);
    if (lens === 'pours') {
      return [...visible].sort(
        (a, b) => new Date(lastPour.get(b.name)!.createdAt).getTime() - new Date(lastPour.get(a.name)!.createdAt).getTime()
      );
    }
    const from = you ?? { x: 0, y: 0 };
    return [...visible].sort((a, b) => calculateDistance(from, a) - calculateDistance(from, b)).slice(0, NEAREST_COUNT);
  }, [lens, menu, visible, lastPour, you]);

  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;
  const sameSpot = selectedDrink
    ? visible.filter((d) => d.name !== selectedDrink.name && key(d) === key(selectedDrink))
    : [];

  const variantFor = (spot: Spot): 'filled' | 'hollow' | 'muted' => {
    if (lens === 'pours') {
      const best = Math.max(...spot.drinks.map((d) => lastPour.get(d.name)?.rating.hedonic ?? 0));
      return best >= 7 ? 'filled' : best <= 4 ? 'muted' : 'hollow';
    }
    if (lens === 'menu') return 'filled';
    return spot.drinks.some((d) => menu.includes(d.name)) ? 'filled' : 'hollow';
  };

  const choose = (drinkName: string) => setSelected((s) => (s === drinkName ? null : drinkName));

  const legend =
    lens === 'pours'
      ? [
          { variant: 'filled', label: mapTab.legendLiked },
          { variant: 'hollow', label: pour.hedonic[4] },
          { variant: 'muted', label: mapTab.legendNot },
        ]
      : lens === 'all'
        ? [
            { variant: 'filled', label: mapTab.legendMenu },
            { variant: 'hollow', label: mapTab.legendElsewhere },
          ]
        : [];

  const listTitle = lens === 'menu' ? mapTab.onMenu : lens === 'pours' ? mapTab.poured : mapTab.nearest;

  return (
    <div className="flex flex-col">
      <div role="group" aria-label={mapTab.lensLabel} className="grid grid-cols-3 border border-foreground">
        {mapTab.lenses.map((l, i) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={lens === l.id}
            onClick={() => {
              setLens(l.id);
              setSelected(null);
            }}
            className={cn(
              'min-h-11 font-condensed text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              i > 0 && 'border-l border-foreground',
              lens === l.id ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground hover:bg-muted'
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <CoordinateMap you={you ?? undefined} showAxes className="mt-4">
        {spots.map((spot) => (
          <DrinkSpot
            key={spot.key}
            x={spot.x}
            y={spot.y}
            variant={variantFor(spot)}
            selected={spot.drinks.some((d) => d.name === selected)}
            label={spot.drinks.map((d) => name(d.name)).join(', ')}
            onSelect={() => choose(spot.drinks[0].name)}
          />
        ))}
        {you && <YouMark x={you.x} y={you.y} label={`Your coordinate, in ${quadrantFor(you.x, you.y).name}`} />}
      </CoordinateMap>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
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
        {!selectedDrink && <span className="text-meta text-muted-foreground">{mapTab.hint}</span>}
      </div>

      {selectedDrink && (
        <DrinkPanel
          drink={selectedDrink}
          title={name(selectedDrink.name)}
          entry={register[selectedDrink.name]}
          closeness={closeness[selectedDrink.name]}
          last={lastPour.get(selectedDrink.name)}
          sameSpot={sameSpot.map((d) => ({ id: d.name, label: name(d.name) }))}
          onPick={setSelected}
          onLog={() => onLog(selectedDrink.name)}
          onClose={() => setSelected(null)}
        />
      )}

      <section className="mt-8">
        <h2 className="border-b border-foreground pb-1.5 font-serif text-xl font-bold">{listTitle}</h2>
        {ordered.length === 0 ? (
          <p className="border-b border-border py-6 font-serif text-prose italic text-muted-foreground">
            {lens === 'pours' ? mapTab.noPours : '—'}
          </p>
        ) : (
          <ol>
            {ordered.map((d, i) => {
              const last = lastPour.get(d.name);
              const figure =
                lens === 'pours' && last ? pour.scoreOf(last.rating.hedonic) : closeness[d.name]?.toString() ?? '';
              return (
                <li key={d.name} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => choose(d.name)}
                    aria-pressed={selected === d.name}
                    className="dot-leader min-h-11 w-full py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {lens !== 'pours' && (
                      <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{i + 1}</span>
                    )}
                    <span
                      className={cn(
                        'font-serif text-prose font-bold transition-colors hover:text-primary',
                        selected === d.name ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {name(d.name)}
                    </span>
                    <span aria-hidden="true" className="leader" />
                    <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums">{figure}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {lens === 'pours' && offMap > 0 && <p className="mt-3 text-meta text-muted-foreground">{mapTab.offMap(offMap)}</p>}
      </section>
    </div>
  );
}

function DrinkPanel({
  drink,
  title,
  entry,
  closeness,
  last,
  sameSpot,
  onPick,
  onLog,
  onClose,
}: {
  drink: Drink;
  title: string;
  entry?: Register[string];
  closeness?: number;
  last?: PourRecord;
  sameSpot: { id: string; label: string }[];
  onPick: (name: string) => void;
  onLog: () => void;
  onClose: () => void;
}) {
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
      aria-live="polite"
      className="mt-4 flex flex-col gap-2.5 border border-foreground bg-card p-4.5 motion-safe:animate-in motion-safe:fade-in"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
          {region.name} · {formatCoordinate(drink.x, drink.y)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="-my-2 -mr-2 flex min-h-11 items-center px-2 font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mapTab.close}
        </button>
      </div>
      <span className="font-serif text-title font-bold text-foreground">{title}</span>
      {entry?.build && <span className="text-sm text-muted-foreground">{entry.build}</span>}

      <dl className="border-t border-border pt-1">
        {closeness !== undefined && (
          <div className="dot-leader py-1.5">
            <dt className="text-meta text-muted-foreground">{mapTab.closeness}</dt>
            <span aria-hidden="true" className="leader" />
            <dd className="font-condensed text-ui font-bold tabular-nums">{closeness}</dd>
          </div>
        )}
        {lastLine && (
          <div className="dot-leader py-1.5">
            <dt className="text-meta text-muted-foreground">{mapTab.lastPour}</dt>
            <span aria-hidden="true" className="leader" />
            <dd className="font-condensed text-ui font-semibold">{lastLine}</dd>
          </div>
        )}
      </dl>

      {sameSpot.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">{mapTab.sameSpot}</span>
          {sameSpot.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onPick(d.id)}
              className="min-h-9 border border-border px-2.5 font-condensed text-xs uppercase tracking-label text-secondary transition-colors hover:border-foreground"
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onLog}
          className="min-h-11 border border-foreground bg-secondary px-5 font-condensed text-xs font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {mapTab.logThis}
        </button>
        {entry && (
          <a
            href={`/drinks/${entry.slug}`}
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-primary hover:underline"
          >
            {mapTab.readEntry} &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
