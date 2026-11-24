import { lazy, Suspense } from 'react';
import { formatDistance, type OsmBar } from '@/lib/osm';
import type { Nearby } from '@/hooks/useNearby';
import { compass } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { PinnedCard } from './PinnedCard';
import { Empty } from './ui';

const NearMap = lazy(() => import('./NearMap').then((m) => ({ default: m.NearMap })));

/**
 * Bars near you, on Compass: once asked for, the map, in a frame that holds
 * its height whatever state it is in, so nothing below it moves when it fills. A frame
 * on the ground, as a printed chart has, not a sheet: the sheet is the top pick.
 */
export function NearPanel({
  nearby,
  known,
  selected,
  onSelect,
}: {
  nearby: Nearby;
  known: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { status, you, bars, search, locate } = nearby;
  // Before anyone asks, a ruled section, not an empty frame: the frame holds its
  // height so nothing jumps while the map is found and drawn, which only
  // matters once it has been asked for.
  if (status === 'idle') {
    return (
      <section aria-label={compass.mapLabel} className="pt-4">
        <h2 className="section-title">{compass.nearTitle}</h2>
        <p className="mt-3 text-meta text-muted-foreground">{compass.nearNote}</p>
        <button type="button" onClick={locate} className="btn btn-primary mt-4 px-5">
          {compass.showNear}
        </button>
      </section>
    );
  }
  return (
    <section aria-label={compass.mapLabel}>
      <div className="relative h-72 overflow-hidden border border-foreground lg:h-96">
        {status === 'ready' && you ? (
          <Suspense fallback={null}>
            <NearMap key={search} you={you} bars={bars} known={known} selected={selected} onSelect={onSelect} />
          </Suspense>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            {status === 'locating' ? (
              <p className="font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">{compass.locating}</p>
            ) : status === 'denied' ? (
              <p className="text-meta text-muted-foreground">{compass.denied}</p>
            ) : (
              <>
                {status === 'failed' && <p className="text-meta text-destructive">{compass.failed}</p>}
                {status === 'unlocated' && <p className="text-meta text-destructive">{compass.unlocated}</p>}
                <button type="button" onClick={locate} className="btn btn-primary px-5">
                  {status === 'failed' || status === 'unlocated' ? compass.retry : compass.showNear}
                </button>
                <p className="max-w-xs text-meta text-muted-foreground">{compass.nearNote}</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === 'ready' && (
        <div className="mt-4">
          <h2 className="section-title">{compass.nearTitle}</h2>
          {bars.length === 0 ? (
            <Empty>{compass.noneNear}</Empty>
          ) : (
            <BarRows bars={bars.slice(0, 8)} known={known} selected={selected} onSelect={onSelect} />
          )}
        </div>
      )}
    </section>
  );
}

/** Bars from the map as rows: name, then how far. The row selects the bar. */
export function BarRows({
  bars,
  known,
  selected,
  onSelect,
}: {
  bars: OsmBar[];
  known: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ol>
      {bars.map((b) => (
        <li key={b.id} className="border-b border-border">
          <button
            type="button"
            aria-pressed={selected === b.id}
            onClick={() => onSelect(b.id)}
            className="dot-leader min-h-11 w-full py-3 text-left focus-ring-inset"
          >
            <span
              className={cn(
                'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
                selected === b.id || known.has(b.id) ? 'text-primary' : 'text-foreground'
              )}
            >
              {b.name}
            </span>
            <span aria-hidden="true" className="leader" />
            <span className="shrink-0 text-meta tabular-nums text-muted-foreground">
              {formatDistance(b.distance)}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * A bar, opened: pinned above the app bar like the drink card, with the one
 * thing to do there — pick a drink — which opens its menu on Compass carrying
 * where the bar is, so the pour can record it (`community.lexicon.location.geo`).
 */
export function BarCard({
  bar,
  poured,
  onPick,
  onClose,
}: {
  bar: OsmBar;
  poured: number;
  onPick: () => void;
  onClose: () => void;
}) {
  return (
    <PinnedCard eyebrow={`${compass.kinds[bar.kind]} · ${formatDistance(bar.distance)}`} onClose={onClose}>
      <span className="font-serif text-subtitle font-bold leading-tight text-foreground">{bar.name}</span>
      {poured > 0 && <span className="text-meta text-primary">{compass.pouredHere(poured)}</span>}
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={onPick} className="btn btn-primary px-5">
          {compass.pickHere}
        </button>
        <a
          href={`https://www.openstreetmap.org/${bar.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {compass.onOsm} &rarr;
        </a>
      </div>
    </PinnedCard>
  );
}
