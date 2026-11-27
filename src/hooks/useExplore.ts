import { useCallback, useEffect, useMemo, useState } from 'react';
import { drinkDatabase, type Drink } from '@/lib/drinks/data';
import { savePick } from '@/lib/device-store';
import { chart, compass, mapPage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/drinks/register';
import { userFromProfile } from '@/lib/palate/profile';
import { barsFromPours, foldName, lastPourByDrink, logTotals } from '@/lib/pours/pour-history';
import { drinksAtSameSpot, namesMatching, searchDrinks, unlistedBar } from '@/lib/drinks/search';
import { addMenuLines, rankMenu, type MenuItem } from '@/lib/drinks/menu-rank';
import { readMapView, readMenuHandoff, VIEW_PARAMS } from '@/lib/map/map-url';
import type { Side } from '@/lib/palate/compare';
import { quadrantIdFor, type QuadrantId } from '@/lib/map/coordinates';
import { buildTerrain, evidenceAt, kindOf, leanings, sampleTerrain, type TerrainStart } from '@/lib/palate/terrain';
import { distanceRun } from '@/lib/palate/track';
import { useMemberData } from '@/hooks/useMemberData';
import { useMenu } from '@/hooks/useMenu';
import { useNearby } from '@/hooks/useNearby';
import { useRateSheet } from '@/hooks/useRateSheet';
import { useTrack } from '@/hooks/useTrack';

/** A bar open on the map. No name means no bar named: a menu in hand, at home. `at` is where the bar is. */
export interface Venue {
  name: string | null;
  at?: { lat: number; lon: number };
  /** OpenStreetMap element id (`node/123` or `way/456`) when opened from nearby bars. */
  osmId?: string;
  /** Preloaded menu lines (from `/v/<handle>`). */
  initialLines?: string[];
}

/**
 * Everything the map screen knows and can do, so `Explore.tsx` only draws it.
 * One screen in place of Compass and Your map: your terrain on the map
 * (`buildTerrain`, from where the questions put you and every pour since),
 * one search over drinks and bars, a bar as a filter on the map (its menu's
 * drinks become numbered pins), a drink open in the card, rating in the card,
 * and what your pours add up to. The rules live in `src/lib`; this hook holds
 * state and wires them up.
 *
 * The address carries what was asked for on arrival: `?q=` (the header's
 * search, which works without script), `?drink=<slug>` (from a drink entry),
 * `?menu=1` (a menu in hand), `?venue=<handle>` (a bar's published menu), and
 * `?rate=` / `?draft=1` (`useRateSheet`).
 */
export function useExplore(
  register: Register,
  member: { did: string; handle: string | null } | null,
  initialQuery = '',
  /** The drink the address opens (`?drink=`), as the server read it, so the page is drawn with its card open. */
  initialDrink: string | null = null,
  /** The region the address narrows the map to (`?region=`), as the server read it. */
  initialRegion: QuadrantId | null = null
) {
  const isMember = !!member;
  const { profile, setProfile, forgetProfile, pours, start, reload } = useMemberData(isMember);
  const history = useMemo(() => pours ?? [], [pours]);
  const rate = useRateSheet();
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { scored, menu } = useMenu(user, profile?.vibeTags, history, start);
  const { track, fromQuiz } = useTrack(isMember, profile, pours, start);
  const nearby = useNearby();
  const name = useCallback((n: string) => titleOf(register, n), [register]);

  // Your terrain, as the map draws it: where the questions put you (or your point, with no quiz) and every pour since.
  const terrainStart: TerrainStart | null = useMemo(
    () => start ?? (profile ? { x: profile.x, y: profile.y, ...(profile.variance ? { variance: profile.variance } : {}) } : null),
    [start, profile]
  );
  const terrain = useMemo(() => (terrainStart ? buildTerrain(terrainStart, history) : null), [terrainStart, history]);
  const ground = useMemo(() => (terrain ? sampleTerrain(terrain, 0.5) : null), [terrain]);
  // Your taste as one side of a comparison (`compare.ts`): what a drink, or a person, is measured against.
  const side: Side | null = useMemo(
    () =>
      terrain && profile
        ? { terrain, point: { x: profile.x, y: profile.y }, aversions: { smoke: profile.dislikesSmoke, bitter: profile.dislikesBitter, anise: profile.dislikesAnise } }
        : null,
    [terrain, profile]
  );
  const lean = useMemo(() => (terrain ? leanings(terrain, 2) : []), [terrain]);
  const lastPour = useMemo(() => lastPourByDrink(history), [history]);

  /** What put a drink where it stands: your ratings near it, or your answers (`chart.reason`). */
  const reasonFor = useCallback(
    (d: Drink) => {
      const rated = lastPour.get(d.name)?.rating.hedonic;
      const near = terrain
        ? evidenceAt(terrain, d.x, d.y, kindOf(d))
            .filter((e) => e.drink.name !== d.name)
            .map((e) => ({ name: name(e.drink.name), hedonic: e.hedonic }))
        : [];
      return chart.reason(near, rated);
    },
    [terrain, lastPour, name]
  );

  // ---- The search, in the header -------------------------------------------------------
  const [query, setQueryState] = useState(initialQuery);
  const searching = !!foldName(query);
  const bars = useMemo(() => barsFromPours(history), [history]);
  const drinkHits = useMemo(() => searchDrinks(query, scored, register), [query, scored, register]);
  const barHits = searching ? namesMatching(query, bars) : bars;
  const nearHits = searching ? namesMatching(query, nearby.bars) : nearby.bars.slice(0, 5);
  const offerBar = unlistedBar(query, drinkHits.length > 0, barHits, nearHits);

  // ---- What the card is about ------------------------------------------------------------
  const [selected, setSelected] = useState<string | null>(initialDrink);
  // A region is a filter on the map (`?region=`): it washes the region and names its drinks; a drink opened from it comes back to it.
  const [region, setRegion] = useState<QuadrantId | null>(initialRegion);
  const [hover, setHover] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [typedBar, setTypedBar] = useState('');
  const [up, setUp] = useState(false);
  // Bumped when a pick is kept, so the waiting strip reads the device again.
  const [pickVersion, setPickVersion] = useState(0);

  const setQuery = (next: string) => setQueryState(next);

  const barName = venue ? (venue.name ?? typedBar).trim() || null : null;
  const ranked = useMemo(
    () => (venue && profile ? rankMenu(items, profile, history, barName ?? compass.atMenu.homeTitle, terrainStart ?? undefined) : []),
    [venue, profile, items, history, barName, terrainStart]
  );

  const openBar = useCallback(
    (next: Venue) => {
      setVenue(next);
      setItems(next.initialLines?.length ? addMenuLines([], next.initialLines.join('\n'), register) : []);
      setTypedBar('');
      setSelected(null);
      setQueryState('');
      setUp(false);
    },
    [register]
  );
  const syncMapUrl = useCallback((drinkName: string | null, regionId: QuadrantId | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    // Rating links own `drink=` for the pour, not the view.
    if (url.searchParams.has('rate') || url.searchParams.get('draft') === '1') return;
    const slug = drinkName ? drinkDatabase.find((d) => d.name === drinkName)?.slug : undefined;
    if (slug) url.searchParams.set(VIEW_PARAMS.drink, slug);
    else url.searchParams.delete(VIEW_PARAMS.drink);
    if (regionId) url.searchParams.set(VIEW_PARAMS.region, regionId);
    else url.searchParams.delete(VIEW_PARAMS.region);
    const next = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) window.history.pushState({}, '', next);
  }, []);

  const leaveBar = () => {
    setVenue(null);
    setItems([]);
    setSelected(null);
  };
  const chooseDrink = (drinkName: string) => {
    const next = selected === drinkName ? null : drinkName;
    setSelected(next);
    setQueryState('');
    setUp(false);
    syncMapUrl(next, region);
  };
  const closeDrink = () => {
    setSelected(null);
    syncMapUrl(null, region);
  };
  const openRegion = (id: QuadrantId | null) => {
    setRegion(id);
    setSelected(null);
    setQueryState('');
    syncMapUrl(null, id);
  };

  useEffect(() => {
    const onPopState = () => {
      const { drink, region: regionId } = readMapView(new URLSearchParams(window.location.search));
      setSelected(drink?.name ?? null);
      setRegion(regionId);
      setUp(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Arrivals: ?drink=<slug> (not on ?draft= or ?rate= links), ?menu=1, ?venue=<handle>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // The map's address (`map-url.ts`): `drink=` is the view's, except on a rating link, where it is the pour's.
    const { drink, region: regionId } = readMapView(params);
    if (regionId) setRegion(regionId);
    if (drink) {
      setSelected(drink.name);
      return;
    }
    const handoff = readMenuHandoff(params);
    if (handoff) {
      openBar({
        name: handoff.bar,
        ...(handoff.items.length > 0 ? { initialLines: handoff.items } : {}),
      });
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
          openBar({ name: data.venue.name, initialLines });
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [openBar]);

  // A rating request (a tap on Rate this, a pick, ?rate=, a chat's draft) opens the card on it.
  useEffect(() => {
    if (rate.request) setUp(true);
  }, [rate.request]);

  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;

  /** Keep a drink as the pick, waiting to be rated: at the bar that is open, or with no bar. */
  const pick = (drinkName: string) => {
    savePick({
      drink: drinkName,
      ...(barName ? { bar: barName } : venue ? { atHome: true } : {}),
      ...(barName && venue?.at && barName === venue.name ? { at: venue.at } : {}),
      pickedAt: new Date().toISOString(),
    });
    setPickVersion((v) => v + 1);
    setVenue(null);
    setItems([]);
    setSelected(null);
    setUp(false);
  };

  // What your pours add up to.
  const totals = logTotals(history);
  const stats =
    totals.pours === 0
      ? []
      : [
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

  return {
    isMember,
    profile,
    setProfile,
    forgetProfile,
    pours,
    history,
    start,
    reload,
    register,
    name,
    /** No coordinate yet: the map shows the drinks and the card asks the questions. */
    cold: !profile,

    // The map
    ground,
    side,
    lastPour,
    leanings: lean,
    hover,
    setHover,

    // Your menu, each drink with what put it there
    scored,
    menu: menu.map((d) => ({ ...d, reason: reasonFor(d) })),
    reasonFor,

    // The search
    query,
    setQuery,
    searching,
    drinkHits: drinkHits.slice(0, 12),
    barHits,
    nearHits,
    offerBar,
    nearby,

    // The card
    up,
    setUp,
    selected,
    selectedDrink,
    sameSpot: selectedDrink ? drinksAtSameSpot(selectedDrink) : [],
    chooseDrink,
    closeDrink,
    region,
    regionDrinks: region ? drinkDatabase.filter((d) => quadrantIdFor(d.x, d.y) === region).sort((a, b) => name(a.name).localeCompare(name(b.name))) : [],
    openRegion,
    venue,
    barName,
    typedBar,
    setTypedBar,
    items,
    setItems,
    ranked,
    openBar,
    leaveBar,
    pick,
    pickVersion: pickVersion + rate.version,
    rate,

    // You
    track,
    startLabel: fromQuiz ? mapPage.started : mapPage.startedCentre,
    stats,
  };
}

export type Explore = ReturnType<typeof useExplore>;
