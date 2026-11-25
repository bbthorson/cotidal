import { useMemo } from 'react';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatCoordinate } from '@/lib/coordinate';
import { lastPourByDrink } from '@/lib/pour-history';
import { chart, menu } from '@/lib/copy';
import type { PourRecord } from '@/lib/atproto/records';
import type { TrackPoint } from '@/lib/track';
import { CoordinateMap, DrinkDot, ShoalMark, TrackLine, YouMark } from './CoordinateMap';
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
 * The marks are not buttons: every pour is in the log under the chart, at
 * full size, which is the way to reach one.
 */
export function YourChart({
  you,
  track,
  pours,
  eyebrow,
}: {
  you: { x: number; y: number };
  /** Your track (`useTrack`), when it adds up. */
  track: readonly TrackPoint[] | null;
  pours: PourRecord[];
  /** Said before "You are in" — "On this device", for a guest. */
  eyebrow?: string;
}) {
  const region = quadrantFor(you.x, you.y);
  const poured = useMemo(() => {
    const last = lastPourByDrink(pours);
    return drinkDatabase.flatMap((d) => {
      const pour = last.get(d.name);
      return pour ? [{ x: d.x, y: d.y, liked: pour.rating.hedonic >= LIKED }] : [];
    });
  }, [pours]);
  const hasTrack = !!track && track.length > 1;
  const spread = track && track.length > 0 ? track[track.length - 1].spread : null;

  return (
    <section aria-label={chart.yoursLabel}>
      <CoordinateMap you={you} showAxes graticule>
        {spread !== null && <ShoalMark x={you.x} y={you.y} spread={spread} />}
        {track && track.length > 1 && <TrackLine points={track} />}
        {poured.map((p) => (
          <DrinkDot key={`${p.x},${p.y}`} x={p.x} y={p.y} filled={p.liked} />
        ))}
        <YouMark x={you.x} y={you.y} label={chart.youIn(region.name)} />
      </CoordinateMap>

      {/* The title block: the frame continues around it. */}
      <div className="flex flex-col gap-1 border-x border-b border-foreground bg-card px-3.5 py-3">
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
        <ul className="mt-1 flex flex-wrap gap-x-3.5 gap-y-0.5">
          <LegendItem mark="you">{chart.legendYou}</LegendItem>
          {hasTrack && <LegendItem mark="track">{chart.legendTrack}</LegendItem>}
          {spread !== null && <LegendItem mark="shoal">{chart.legendShoal}</LegendItem>}
          {poured.some((p) => p.liked) && <LegendItem mark="filled">{chart.legendLiked}</LegendItem>}
          {poured.some((p) => !p.liked) && <LegendItem mark="hollow">{chart.legendPoured}</LegendItem>}
        </ul>
      </div>
    </section>
  );
}
