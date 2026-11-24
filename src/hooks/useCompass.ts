import { useCallback, useEffect, useMemo, useState } from 'react';
import { drinkDatabase, type User } from '@/lib/data';
import { savePick } from '@/lib/device-store';
import { titleOf, type Register } from '@/lib/register';
import { userFromProfile } from '@/lib/profile';
import { barsFromPours, foldName, lastPourByDrink, poursAtBars } from '@/lib/pour-history';
import { drinksAtSameSpot, namesMatching, searchDrinks, unlistedBar } from '@/lib/drink-search';
import { explainDrinkMatch } from '@/lib/api-client';
import { useMenu } from '@/hooks/useMenu';
import { useNearby } from '@/hooks/useNearby';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';

/** Where a menu open on Compass is. No name means no bar named: at home. `at` is where the map says the bar is. */
export interface Venue {
  name: string | null;
  at?: { lat: number; lon: number };
}

/**
 * Everything Compass knows and can do, so `Compass.tsx` only draws it: your
 * coordinate and menu, one search over drinks and bars, the bars near you and
 * which you have poured at, what is open (a drink, a bar, a bar's menu), and
 * the rating sheet. The rules live in `src/lib` (`searchDrinks`,
 * `poursAtBars`, `scoreDrinks`); this hook holds state and wires them up.
 */
export function useCompass(register: Register, member: { handle: string | null } | null) {
  const [profile, setProfile] = useProfile(!!member);
  const rate = useRateSheet();
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { pours, reload } = usePours(!!member);
  const history = useMemo(() => pours ?? [], [pours]);
  const lastPour = useMemo(() => lastPourByDrink(history), [history]);
  const { scored, menu, closeness } = useMenu(user, profile?.vibeTags, history);
  const nearby = useNearby();

  const [query, setQueryState] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  // Bumped when a pick is kept, so the waiting strip reads the device again.
  const [pickVersion, setPickVersion] = useState(0);

  const displayName = useCallback((name: string) => titleOf(register, name), [register]);

  // Your bars, and which bars on the street map you have poured at.
  const bars = useMemo(() => barsFromPours(history), [history]);
  const pouredAt = useMemo(() => poursAtBars(nearby.bars, history), [nearby.bars, history]);
  const known = useMemo(() => new Set(pouredAt.keys()), [pouredAt]);

  // The search: what was typed, folded, and what it finds.
  const searching = !!foldName(query);
  const drinkHits = useMemo(() => searchDrinks(query, scored, register), [query, scored, register]);
  const barHits = searching ? namesMatching(query, bars) : bars;
  const nearHits = searching ? namesMatching(query, nearby.bars) : [];
  const offerBar = unlistedBar(query, barHits, nearHits);

  const setQuery = (next: string) => {
    setQueryState(next);
    setSelected(null);
  };

  // "Pick a drink" from another screen arrives with `?menu=1`: straight to a menu.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('menu') === '1') setVenue({ name: null });
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [venue]);

  const chooseDrink = (name: string) => {
    setSelectedBar(null);
    setSelected((s) => (s === name ? null : name));
  };
  const chooseBar = (id: string) => {
    setSelected(null);
    setSelectedBar((cur) => (cur === id ? null : id));
  };
  const openMenu = (next: Venue) => {
    setSelected(null);
    setSelectedBar(null);
    setVenue(next);
  };
  const closeMenu = () => setVenue(null);

  /** A pick was kept: back to the list, and the waiting strip shows it. */
  const picked = () => {
    setVenue(null);
    setSelected(null);
    setPickVersion((v) => v + 1);
    window.scrollTo(0, 0);
  };

  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;
  const openBar = selectedBar ? nearby.bars.find((b) => b.id === selectedBar) ?? null : null;

  /** Keep the drink open in the card as your pick, with no bar. */
  const pickSelected = () => {
    if (!selectedDrink) return;
    savePick({ drink: selectedDrink.name, pickedAt: new Date().toISOString() });
    picked();
  };

  return {
    profile,
    setProfile,
    user,
    hasCoordinate: !!profile,
    pours,
    reload,
    history,
    rate,
    displayName,

    // Your menu
    top: menu[0],
    rest: menu.slice(1),
    closeness,
    lastPour,

    // The search
    query,
    setQuery,
    searching,
    drinkHits,
    barHits,
    nearHits,
    offerBar,

    // Bars
    nearby,
    bars,
    pouredAt,
    known,

    // What is open
    selected,
    selectedDrink,
    sameSpot: selectedDrink ? drinksAtSameSpot(selectedDrink) : [],
    chooseDrink,
    setSelected,
    closeDrink: () => setSelected(null),
    pickSelected,
    selectedBar,
    openBar,
    chooseBar,
    closeBar: () => setSelectedBar(null),
    venue,
    openMenu,
    closeMenu,
    picked,
    waitingVersion: pickVersion + rate.version,
  };
}

/**
 * Why the top pick suits you, fetched once for the drink on top. `loading`
 * until the answer for this drink lands; `text` is `null` when it failed, so
 * the sheet shows nothing rather than a stand-in.
 */
export function useTopPickReason(drinkName: string, user: User) {
  const [why, setWhy] = useState<{ name: string; text: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    explainDrinkMatch(drinkName, {
      x: user.x,
      y: user.y,
      dislikesSmoke: user.filters.includes('noSmoke'),
      dislikesBitter: user.filters.includes('noBitter'),
    })
      .then((text) => !cancelled && setWhy({ name: drinkName, text }))
      .catch(() => !cancelled && setWhy({ name: drinkName, text: null }));
    return () => {
      cancelled = true;
    };
  }, [drinkName, user.x, user.y, user.filters]);

  const loading = why?.name !== drinkName;
  return { loading, text: loading ? null : why?.text ?? null };
}
