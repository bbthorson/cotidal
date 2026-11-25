import { useCallback, useEffect, useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { savePick } from '@/lib/device-store';
import { titleOf, type Register } from '@/lib/register';
import { chart } from '@/lib/copy';
import { userFromProfile } from '@/lib/profile';
import { barsFromPours, foldName, lastPourByDrink, poursAtBars } from '@/lib/pour-history';
import { drinksAtSameSpot, namesMatching, searchDrinks, unlistedBar } from '@/lib/drink-search';
import { useMenu } from '@/hooks/useMenu';
import { useQuizStart } from '@/hooks/useQuizStart';
import { useNearby } from '@/hooks/useNearby';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';

/** Where a menu open on Compass is. No name means no bar named: at home. `at` is where the map says the bar is. */
export interface Venue {
  name: string | null;
  at?: { lat: number; lon: number };
  /** Preloaded menu lines (e.g. from `/v/<handle>`). */
  initialLines?: string[];
}

/**
 * Everything Compass knows and can do, so `Compass.tsx` only draws it: your
 * coordinate and menu on the chart, one search over drinks and bars, the bars near you and
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
  const start = useQuizStart(!!member);
  const { scored, menu, distance } = useMenu(user, profile?.vibeTags, history, start);
  const nearby = useNearby();
  // With no position yet, search and bars wait until asked for ("or look up a drink").
  const [browsing, setBrowsing] = useState(false);

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
  const offerBar = unlistedBar(query, drinkHits.length > 0, barHits, nearHits);

  const setQuery = (next: string) => {
    setQueryState(next);
    setSelected(null);
  };

  // "Pick a drink" arrives with `?menu=1`; `/v/<handle>` arrives with `?venue=<handle>`.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('menu') === '1') {
      setVenue({ name: null });
      return;
    }
    const handle = params.get('venue')?.trim();
    if (!handle) return;
    let cancelled = false;
    fetch(`/api/venue?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            status?: string;
            venue?: { name: string; menu?: { sections: { items: { name: string; description: string | null }[] }[] } | null };
          } | null
        ) => {
          if (cancelled || !data || data.status !== 'ok' || !data.venue) return;
          const initialLines = (data.venue.menu?.sections ?? []).flatMap((s) =>
            s.items.map((item) => (item.description ? `${item.name} — ${item.description}` : item.name))
          );
          setVenue({ name: data.venue.name, initialLines });
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    /** Where the questions put you: the first hill of the terrain a bar's menu is ranked on. */
    start,

    // Your menu, each drink with what put it there: your own ratings near it, or your answers
    menu: menu.map((d) => ({
      ...d,
      reason: chart.reason(
        d.evidence.map((e) => ({ name: titleOf(register, e.drink.name), hedonic: e.hedonic })),
        d.rated
      ),
    })),
    // No position, no menu: the chart fills nothing ranked around a point nobody chose.
    menuNames: profile ? menu.map((d) => d.name) : [],
    distance,
    lastPour,

    browsing,
    browse: () => setBrowsing(true),

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
