import { useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { userFromProfile } from '@/lib/profile';
import { lastPourByDrink } from '@/lib/pour-history';
import { useMenu } from '@/hooks/useMenu';
import { quadrantFor } from '@/lib/quadrant';
import { mapPage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { logTotals } from '@/lib/pour-history';
import { distanceRun } from '@/lib/track';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';
import { useTrack } from '@/hooks/useTrack';

/**
 * Everything Your map knows and can do, so `MapScreen.tsx` only draws it: your
 * coordinate and region, your track, the drinks you have poured (one opens
 * in the drink card when its dot is tapped), what your pours add up to, and
 * the rating sheet.
 */
export function useMap(register: Register, member: { did: string; handle: string | null } | null) {
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours, reload } = usePours(isMember);
  const rate = useRateSheet();
  const history = useMemo(() => pours ?? [], [pours]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;

  const { track, fromQuiz } = useTrack(isMember, profile, pours);

  // The drinks you have poured, and the one open in the drink card. Distances
  // come from the same ranking Compass shows (`useMenu`), so they agree.
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { distance } = useMenu(user, profile?.vibeTags, history);
  const lastPour = useMemo(() => lastPourByDrink(history), [history]);
  const poured = useMemo(() => drinkDatabase.filter((d) => lastPour.has(d.name)), [lastPour]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDrink = selected ? poured.find((d) => d.name === selected) ?? null : null;
  const name = (n: string) => titleOf(register, n);

  const totals = logTotals(history);
  // No figures before the first pour: "Pours 0 · Bars 0" only repeated the
  // log's own empty line under it.
  const stats = totals.pours === 0 ? [] : [
    { label: mapPage.stats.pours, value: String(totals.pours) },
    { label: mapPage.stats.bars, value: String(totals.bars) },
    ...(track && track.length > 1 ? [{ label: mapPage.stats.moved, value: String(distanceRun(track)) }] : []),
    ...(totals.first
      ? [
          {
            label: mapPage.stats.since,
            value: new Date(totals.first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
  ];

  const t = profile?.tolerances;
  const tolerances =
    t && t.eventCount >= 3
      ? [
          { label: mapPage.tolerances.bitter, value: t.bitter.toFixed(1) },
          { label: mapPage.tolerances.tannin, value: t.tannin.toFixed(1) },
          { label: mapPage.tolerances.complexity, value: t.complexity.toFixed(1) },
        ]
      : null;

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
    startLabel: fromQuiz ? mapPage.started : mapPage.startedCentre,
    stats,
    tolerances,

    // Your pours on the chart, and the drink card
    poured,
    lastPour,
    distance,
    selected,
    selectedDrink,
    /** Poured drinks sharing the open one's coordinate: the card's "Also here". */
    sameSpot: selectedDrink
      ? poured.filter((d) => d.name !== selectedDrink.name && d.x === selectedDrink.x && d.y === selectedDrink.y)
      : [],
    chooseDrink: (drinkName: string) => setSelected((prev) => (prev === drinkName ? null : drinkName)),
    setSelected,
    closeDrink: () => setSelected(null),
  };
}
