import { useMemo } from 'react';
import { quadrantFor } from '@/lib/quadrant';
import { chart, logPage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { logTotals } from '@/lib/pour-history';
import { distanceRun } from '@/lib/track';
import { closestDrinks } from '@/lib/drink-search';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';
import { useTrack } from '@/hooks/useTrack';

/** What the chart shows: your menu filled in, or your pours. */
export type Lens = (typeof chart.lenses)[number]['id'];

/**
 * Everything Log knows and can do, so `LogScreen.tsx` only draws it: your
 * coordinate and region, your track, what your pours add up to, and the
 * rating sheet.
 */
export function useLog(register: Register, member: { handle: string | null } | null) {
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours, reload } = usePours(isMember);
  const rate = useRateSheet();
  const history = useMemo(() => pours ?? [], [pours]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;

  const { track, fromQuiz } = useTrack(isMember, profile, pours);
  const name = (n: string) => titleOf(register, n);

  // The drink closest to you, for the account's "share" line.
  const nearest = useMemo(() => closestDrinks({ x, y }, 1)[0]?.name ?? '', [x, y]);

  const totals = logTotals(history);
  const stats = [
    { label: logPage.stats.pours, value: String(totals.pours) },
    { label: logPage.stats.bars, value: String(totals.bars) },
    ...(track && track.length > 1 ? [{ label: logPage.stats.moved, value: String(distanceRun(track)) }] : []),
    ...(totals.first
      ? [
          {
            label: logPage.stats.since,
            value: new Date(totals.first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
  ];

  return {
    isMember,
    profile,
    setProfile,
    pours,
    reload,
    history,
    rate,
    name,
    /** A stranger with no coordinate: the page says what it is, and the ways in. */
    cold: !profile && !isMember,
    you: { x, y },
    region: quadrantFor(x, y),
    /** Your track when it adds up (`useTrack`), and what it starts from. */
    track,
    startLabel: fromQuiz ? logPage.started : logPage.startedCentre,
    nearestName: name(nearest),
    stats,
  };
}
