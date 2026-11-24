import { Fragment } from 'react';
import type { PourRecord, Deviation, CataNote } from '@/lib/atproto/records';
import type { Register } from '@/lib/register';
import { drinkOf } from '@/lib/drink-match';
import type { TrackPoint } from '@/lib/track';
import { formatCoordinate } from '@/lib/coordinate';
import { logPage, pour } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { Empty, Loading } from './ui';

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
export function PourLedger({ pours, register = {}, empty, loading = false, track = null, startLabel = logPage.started }: PourLedgerProps) {
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
    <li key="start" className="flex flex-col gap-1.5 border-b border-border py-3.5">
      <div className="dot-leader">
        <span aria-hidden="true" className="w-5.5 shrink-0 font-condensed text-meta font-bold text-primary">·</span>
        <span className="font-serif text-prose font-bold text-foreground">{startLabel}</span>
      </div>
      <p className="text-meta text-muted-foreground">{logPage.startedAt(formatCoordinate(start.x, start.y))}</p>
    </li>
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
          <li className="flex flex-col gap-1.5 border-b border-border py-3.5">
            <div className="dot-leader">
              <span className="w-5.5 shrink-0 font-condensed text-meta font-bold tabular-nums text-primary">{pours.length - i}</span>
              {entry ? (
                <a
                  href={`/drinks/${entry.slug}`}
                  className="font-serif text-prose font-bold text-foreground transition-colors hover:underline hover:underline-offset-4"
                >
                  {name}
                </a>
              ) : (
                <span className="font-serif text-prose font-bold text-foreground">{name}</span>
              )}
              <span aria-hidden="true" className="leader" />
              <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums">
                {pour.scoreOf(p.rating.hedonic)}
              </span>
            </div>
            <p className="flex items-baseline justify-between gap-3 text-meta text-muted-foreground">
              <span>
                {where ? `${where} · ` : ''}
                {when}
                {' · '}
                {pour.hedonic[p.rating.hedonic - 1]}
              </span>
              {moved !== undefined && (
                <span className={cn('shrink-0 font-condensed font-bold tabular-nums', moved > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {moved > 0 ? logPage.movedOf(moved) : logPage.held}
                </span>
              )}
            </p>
            {p.deviations && p.deviations.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {p.deviations.map((dev) => (
                  <li
                    key={dev}
                    className="tag"
                  >
                    {pour.deviations[dev as Deviation] ?? dev}
                  </li>
                ))}
              </ul>
            )}
            {p.cata && p.cata.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {p.cata.map((desc) => (
                  <li
                    key={desc}
                    className="tag"
                  >
                    {pour.cata[desc as CataNote] ?? desc}
                  </li>
                ))}
              </ul>
            )}
            {p.note && <p className="font-serif text-ui italic text-foreground">“{p.note}”</p>}
          </li>
          </Fragment>
        );
      })}
      {startAt === pours.length && startRow}
    </ol>
  );
}
