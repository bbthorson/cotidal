import { useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { chart, logPage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { lastPourByDrink, logTotals } from '@/lib/pour-history';
import { closestDrinks, drinksAtSameSpot } from '@/lib/drink-search';
import { userFromProfile } from '@/lib/profile';
import { useMenu } from '@/hooks/useMenu';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';

/** What the map on Log shows: your menu filled in, or your pours. */
export type Lens = (typeof chart.lenses)[number]['id'];

/**
 * Everything Log knows and can do, so `LogScreen.tsx` only draws it: your
 * coordinate and region, the map's lens and the drink open on it, what your
 * pours add up to, and the rating sheet.
 */
export function useLog(register: Register, member: { handle: string | null } | null) {
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours, reload } = usePours(isMember);
  const rate = useRateSheet();
  const history = useMemo(() => pours ?? [], [pours]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;

  // The map: your menu filled in, or your pours, and any drink opened in the card.
  const [lens, setLensState] = useState<Lens>('drinks');
  const [selected, setSelected] = useState<string | null>(null);
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { menu, closeness } = useMenu(user, profile?.vibeTags, history);
  const lastPour = useMemo(() => lastPourByDrink(history), [history]);
  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;
  const name = (n: string) => titleOf(register, n);

  // The drink closest to you, for the account's "share" line.
  const nearest = useMemo(() => closestDrinks({ x, y }, 1)[0]?.name ?? '', [x, y]);

  const totals = logTotals(history);
  const stats = [
    { label: logPage.stats.pours, value: String(totals.pours) },
    { label: logPage.stats.bars, value: String(totals.bars) },
    ...(totals.first
      ? [
          {
            label: logPage.stats.since,
            value: new Date(totals.first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
    ...(totals.best ? [{ label: logPage.stats.best, value: name(totals.best.drink.name) }] : []),
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
    menuNames: menu.map((d) => d.name),
    closeness,
    lastPour,
    lens,
    setLens: (next: Lens) => {
      setLensState(next);
      setSelected(null);
    },
    selected,
    setSelected,
    toggleDrink: (n: string) => setSelected((cur) => (cur === n ? null : n)),
    closeDrink: () => setSelected(null),
    selectedDrink,
    sameSpot: selectedDrink ? drinksAtSameSpot(selectedDrink) : [],
    nearestName: name(nearest),
    stats,
  };
}
