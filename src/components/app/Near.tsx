import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { barsNear, formatDistance, type OsmBar } from '@/lib/osm';
import { compass } from '@/lib/copy';
import { harbourAt } from '@/lib/site-nav';
import { cn } from '@/lib/utils';
import { PinnedCard } from './PinnedCard';

const NearMap = lazy(() => import('./NearMap').then((m) => ({ default: m.NearMap })));

type Status = 'idle' | 'locating' | 'ready' | 'denied' | 'failed';

/**
 * Bars near you, from OpenStreetMap. Nothing is asked for until the reader
 * asks — unless the browser already holds their yes for this site, in which
 * case the map opens on its own. The point leaves the device rounded
 * (`barsNear`), and only to OpenStreetMap.
 */
export function useNearby() {
  const [status, setStatus] = useState<Status>('idle');
  const [you, setYou] = useState<{ lat: number; lon: number } | null>(null);
  const [bars, setBars] = useState<OsmBar[]>([]);
  // A new search is a new map.
  const [search, setSearch] = useState(0);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('denied');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          setBars(await barsNear(point));
          setYou(point);
          setSearch((n) => n + 1);
          setStatus('ready');
        } catch (e) {
          console.error('Bars near you:', e);
          setStatus('failed');
        }
      },
      () => setStatus('denied'),
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => p.state === 'granted' && locate())
      .catch(() => {});
  }, [locate]);

  return { status, you, bars, search, locate };
}

/**
 * The first thing on Compass: the map, in a frame that holds its height
 * whatever state it is in, so nothing below it moves when it fills.
 */
export function NearPanel({
  nearby,
  known,
  selected,
  onSelect,
}: {
  nearby: ReturnType<typeof useNearby>;
  known: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { status, you, bars, search, locate } = nearby;
  return (
    <section aria-label={compass.mapLabel}>
      <div className="relative h-72 overflow-hidden border border-foreground bg-card">
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
                <button type="button" onClick={locate} className="btn btn-primary px-5">
                  {status === 'failed' ? compass.retry : compass.showNear}
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
            <p className="border-b border-border py-4 text-meta text-muted-foreground">{compass.noneNear}</p>
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
                'font-serif text-prose font-bold transition-colors hover:text-primary',
                selected === b.id || known.has(b.id) ? 'text-primary' : 'text-foreground'
              )}
            >
              {b.name}
            </span>
            <span aria-hidden="true" className="leader" />
            <span className="shrink-0 font-condensed text-meta uppercase tracking-label text-muted-foreground">
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
 * thing to do there — pick a drink — carrying where the bar is, so the pour
 * can record it (`community.lexicon.location.geo`).
 */
export function BarCard({ bar, poured, onClose }: { bar: OsmBar; poured: number; onClose: () => void }) {
  return (
    <PinnedCard eyebrow={`${compass.kinds[bar.kind]} · ${formatDistance(bar.distance)}`} onClose={onClose}>
      <span className="font-serif text-subtitle font-bold leading-tight text-foreground">{bar.name}</span>
      {poured > 0 && <span className="text-meta text-primary">{compass.pouredHere(poured)}</span>}
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        <a href={harbourAt(bar.name, { lat: bar.lat, lon: bar.lon })} className="btn btn-primary px-5">
          {compass.pickHere}
        </a>
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
