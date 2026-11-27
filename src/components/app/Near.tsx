import { formatDistance, type OsmBar } from '@/lib/drinks/osm';
import type { Nearby } from '@/hooks/useNearby';
import { compass, explore } from '@/lib/copy';
import { Empty, SectionTitle } from './ui';
import { DrinkRow } from './DrinkRow';

/**
 * Bars near you, in the map's card: a list, not a street map — a bar is found
 * by name and opened as a filter on your map, not panned to. Nothing is asked
 * for until the reader taps Show bars near me, unless the browser already
 * holds their yes for this site. The point leaves the device rounded, and
 * only to OpenStreetMap (`useNearby`).
 */
export function NearList({ nearby, onOpen }: { nearby: Nearby; onOpen: (bar: OsmBar) => void }) {
  const { status, bars, locate } = nearby;
  return (
    <section aria-label={explore.barsNear} className="mt-6">
      <SectionTitle>{explore.barsNear}</SectionTitle>
      {status === 'ready' ? (
        bars.length === 0 ? (
          <Empty>{compass.noneNear}</Empty>
        ) : (
          <ol>
            {bars.slice(0, 8).map((b) => (
              <DrinkRow key={b.id} title={b.name} figure={formatDistance(b.distance)} onSelect={() => onOpen(b)} />
            ))}
          </ol>
        )
      ) : status === 'locating' ? (
        <p className="mt-3 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">{compass.locating}</p>
      ) : (
        <div className="mt-3 flex flex-col items-start gap-3">
          {status === 'denied' && <p className="text-meta text-muted-foreground">{compass.denied}</p>}
          {status === 'failed' && <p className="text-meta text-destructive">{compass.failed}</p>}
          {status === 'unlocated' && <p className="text-meta text-destructive">{compass.unlocated}</p>}
          {status !== 'denied' && (
            <button type="button" onClick={locate} className="btn btn-outline px-5">
              {status === 'failed' || status === 'unlocated' ? compass.retry : compass.showNear}
            </button>
          )}
          <p className="text-meta text-muted-foreground">{compass.nearNote}</p>
        </div>
      )}
    </section>
  );
}
