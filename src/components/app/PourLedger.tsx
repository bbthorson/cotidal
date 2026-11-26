import { Fragment } from 'react';
import type { PourRecord, Deviation, CataNote } from '@/lib/atproto/records';
import type { Register } from '@/lib/register';
import { drinkOf } from '@/lib/drink-match';
import type { TrackPoint } from '@/lib/track';
import { formatCoordinate } from '@/lib/coordinate';
import { mapPage, pour } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { Empty, Loading } from './ui';
import { DrinkRow } from './DrinkRow';

interface PourLedgerProps {
  pours: PourRecord[];
  /** Used to link a pour to its register entry, and to print its tidy name. */
  register?: Register;
  empty: string;
  loading?: boolean;
  /**
   * Your track (`replayTrack`), when it adds up: each entry then says how far
   * its pour moved you, and the log ends where the track starts.
   */
  track?: readonly TrackPoint[] | null;
  /** What the track's start is: the questions, or the centre for a guest who tried a pour first. */
  startLabel?: string;
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * What moved it: every pour as a numbered entry, newest first. Number ·
 * name · leader · score, then where and when and how far it moved you, then
 * what was off and the note. A log, not a stack of cards. With a track, the
 * last entry is where it starts: the questions, and the coordinate they gave.
 */
export function PourLedger({ pours, register = {}, empty, loading = false, track = null, startLabel = mapPage.started }: PourLedgerProps) {
  if (loading) {
    return <Loading />;
  }
  if (pours.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  const moves = new Map(track?.filter((t) => t.pour).map((t) => [t.pour!, t.moved]));
  const start = track?.[0];
  // The start sits under the oldest pour on the track; anything older (before a retake) runs on below it.
  const firstOff = pours.findIndex((p) => !moves.has(p));
  const startAt = start ? (firstOff < 0 ? pours.length : firstOff) : -1;
  const startRow = start && (
    <DrinkRow key="start" rank="·" title={startLabel} note={mapPage.startedAt(formatCoordinate(start.x, start.y))} />
  );

  return (
    <ol>
      {pours.map((p, i) => {
        const moved = moves.get(p);
        // The entry of the drink the pour means (by slug, then name), not of the name as typed.
        const entry = register[drinkOf(p.drink)?.name ?? p.drink.name];
        const name = entry?.title ?? p.drink.name;
        const where = p.isHomePour ? pour.home : p.venue?.entity?.name;
        const when = dateOf(p.createdAt);
        return (
          <Fragment key={`${p.createdAt}-${i}`}>
          {i === startAt && startRow}
          <DrinkRow
            rank={pours.length - i}
            title={name}
            href={entry ? `/drinks/${entry.slug}` : undefined}
            figure={pour.scoreOf(p.rating.hedonic)}
            note={
              <span className="flex items-baseline justify-between gap-3">
                <span>
                  {where ? `${where} · ` : ''}
                  {when}
                  {' · '}
                  {pour.hedonic[p.rating.hedonic - 1]}
                </span>
                {moved !== undefined && (
                  <span className={cn('shrink-0 font-condensed font-bold tabular-nums', moved > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                    {moved > 0 ? mapPage.movedOf(moved) : mapPage.held}
                  </span>
                )}
              </span>
            }
          >
            {p.deviations && p.deviations.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1.5">
                {p.deviations.map((dev) => (
                  <span key={dev} className="tag">
                    {pour.deviations[dev as Deviation] ?? dev}
                  </span>
                ))}
              </span>
            )}
            {p.cata && p.cata.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1.5">
                {p.cata.map((desc) => (
                  <span key={desc} className="tag">
                    {pour.cata[desc as CataNote] ?? desc}
                  </span>
                ))}
              </span>
            )}
            {p.note && <span className="mt-1 font-serif text-ui italic text-foreground">“{p.note}”</span>}
          </DrinkRow>
          </Fragment>
        );
      })}
      {startAt === pours.length && startRow}
    </ol>
  );
}
