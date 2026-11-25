import { useMemo } from 'react';
import type { Drink } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatCoordinate } from '@/lib/coordinate';
import { chart, menu, taste } from '@/lib/copy';
import type { Leaning } from '@/lib/terrain';
import type { PourRecord } from '@/lib/atproto/records';
import type { TrackPoint } from '@/lib/track';
import { CoordinateMap, DrinkSpot, ShoalMark, TrackLine, YouMark } from './CoordinateMap';
import { LegendItem } from './Chart';

/** A rating at or above this is drawn filled: the same 7 that pulls you toward a drink. */
const LIKED = 7;

/**
 * Your map's chart: you, and nothing that is not yours. Where you are, the
 * shoal around you (how sure the replay is), the way you came, and the
 * drinks you have poured — filled where you liked them. The other drinks
 * are Compass's. Under the frame, the title block: the region you are in,
 * your coordinate, and the legend.
 *
 * A poured drink is a spot you can tap: it opens in the drink card, with
 * your last pour of it, as on Compass. Drinks sharing a coordinate are one
 * spot, filled if you liked any of them.
 */
export function YourChart({
  you,
  track,
  poured,
  lastPour,
  selected,
  onSelect,
  name,
  eyebrow,
  leanings = [],
}: {
  you: { x: number; y: number };
  /** Your track (`useTrack`), when it adds up. */
  track: readonly TrackPoint[] | null;
  /** The drinks you have poured, on the map. */
  poured: Drink[];
  lastPour: Map<string, PourRecord>;
  selected: string | null;
  onSelect: (drinkName: string) => void;
  /** A drink's name as the register titles it. */
  name: (drinkName: string) => string;
  /** Said before "You lean" — "On this device", for a guest. */
  eyebrow?: string;
  /** Which ways your taste leans, one per hill (`leanings`): said in the axes' words, never a region's name. */
  leanings?: readonly Leaning[];
}) {
  const region = quadrantFor(you.x, you.y);
  const spots = useMemo(() => {
    const byKey = new Map<string, { key: string; x: number; y: number; drinks: Drink[]; liked: boolean }>();
    for (const d of poured) {
      const key = `${d.x},${d.y}`;
      const spot = byKey.get(key) ?? { key, x: d.x, y: d.y, drinks: [], liked: false };
      spot.drinks.push(d);
      spot.liked ||= (lastPour.get(d.name)?.rating.hedonic ?? 0) >= LIKED;
      byKey.set(key, spot);
    }
    return [...byKey.values()];
  }, [poured, lastPour]);
  const hasTrack = !!track && track.length > 1;
  const spread = track && track.length > 0 ? track[track.length - 1].spread : null;

  return (
    <section aria-label={chart.yoursLabel}>
      <CoordinateMap you={you} showAxes graticule>
        {spread !== null && <ShoalMark x={you.x} y={you.y} spread={spread} />}
        {track && track.length > 1 && <TrackLine points={track} />}
        {spots.map((spot) => (
          <DrinkSpot
            key={spot.key}
            x={spot.x}
            y={spot.y}
            variant={spot.liked ? 'filled' : 'hollow'}
            selected={spot.drinks.some((d) => d.name === selected)}
            label={spot.drinks.map((d) => name(d.name)).join(', ')}
            onSelect={() => onSelect(spot.drinks[0].name)}
          />
        ))}
        <YouMark x={you.x} y={you.y} label={chart.youIn(region.name)} />
      </CoordinateMap>

      {/* The title block: the frame continues around it. */}
      <div className="flex flex-col gap-1 border-x border-b border-foreground bg-card px-3.5 py-3">
        <span className="label-caps">
          {eyebrow && `${eyebrow} · `}
          {leanings.length ? taste.label : menu.youAreIn}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-serif text-subtitle italic leading-none text-primary">
            {leanings.length ? taste.phrases(leanings) : region.name}
          </span>
          <span className="font-condensed text-label font-semibold tabular-nums tracking-label text-secondary">
            {formatCoordinate(you.x, you.y)}
          </span>
        </span>
        <ul className="mt-1 flex flex-wrap gap-x-3.5 gap-y-0.5">
          <LegendItem mark="you">{chart.legendYou}</LegendItem>
          {hasTrack && <LegendItem mark="track">{chart.legendTrack}</LegendItem>}
          {spread !== null && <LegendItem mark="shoal">{chart.legendShoal}</LegendItem>}
          {spots.some((p) => p.liked) && <LegendItem mark="filled">{chart.legendLiked}</LegendItem>}
          {spots.some((p) => !p.liked) && <LegendItem mark="hollow">{chart.legendPoured}</LegendItem>}
        </ul>
      </div>
    </section>
  );
}
