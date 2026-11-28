import { useCallback, useEffect, useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/drinks/data';
import { fetchPublicPalate } from '@/lib/api-client';
import { overlays as copy } from '@/lib/copy';
import { actorParam, readMapView, VIEW_PARAMS } from '@/lib/map/map-url';
import { compareWith, type Side } from '@/lib/palate/compare';
import {
  exploreFrontier,
  filterDrinksByType,
  intersectGrounds,
  rankForTable,
  widestContrastPair,
  type DrinkType,
  type SampledGround,
  type TableMember,
} from '@/lib/palate/overlays';
import { ratingsOf, terrainOf } from '@/lib/palate/taste-reading';
import { peaks, rankByTerrain, sampleTerrain, type Terrain } from '@/lib/palate/terrain';
import { capMarks, comparedDrinks } from '@/lib/map/drawn';

export interface Companion {
  actor: string;
  did: string;
  handle: string;
  terrain: Terrain;
  ground: SampledGround;
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
  point: { x: number; y: number };
  peak: { x: number; y: number };
  rated: Map<string, number>;
}

export type ActiveLens = 'self' | 'with' | 'table' | 'explore';

const MAX_COMPANIONS = 5;

/**
 * Unified overlay state (`Lens × Scope`) for `/`:
 * - **Lens:** `self` | `with` (1 companion) | `table` (2–5 companions) | `explore` (uncharted frontier)
 * - **Scope:** `drinkType` (`Cocktail` | `Wine` | `Beer` | `Spirit` | `null`), composing with bar menus and regions
 *
 * Syncs `?with=`, `?table=`, `?lens=explore`, and `?type=` with browser history.
 */
export function useOverlays({
  mySide,
  myGround,
  myRated,
  myLabel,
}: {
  mySide: Side | null;
  myGround: SampledGround | null;
  myRated: ReadonlyMap<string, number>;
  myLabel: string;
}) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [exploreMode, setExploreMode] = useState(false);
  const [drinkType, setDrinkTypeState] = useState<DrinkType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUrl = useCallback(
    (nextCompanions: readonly Companion[], nextExplore: boolean, nextType: DrinkType | null) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      if (url.searchParams.has('rate') || url.searchParams.get('draft') === '1') return;

      if (nextCompanions.length === 1) {
        url.searchParams.set(VIEW_PARAMS.with, nextCompanions[0].handle);
        url.searchParams.delete(VIEW_PARAMS.table);
      } else if (nextCompanions.length > 1) {
        url.searchParams.delete(VIEW_PARAMS.with);
        url.searchParams.set(VIEW_PARAMS.table, nextCompanions.map((c) => c.handle).join(','));
      } else {
        url.searchParams.delete(VIEW_PARAMS.with);
        url.searchParams.delete(VIEW_PARAMS.table);
      }

      if (nextExplore && nextCompanions.length === 0) url.searchParams.set(VIEW_PARAMS.lens, 'explore');
      else url.searchParams.delete(VIEW_PARAMS.lens);

      if (nextType) url.searchParams.set(VIEW_PARAMS.type, nextType.toLowerCase());
      else url.searchParams.delete(VIEW_PARAMS.type);

      const next = url.pathname + url.search + url.hash;
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (next !== current) window.history.pushState({}, '', next);
    },
    []
  );

  const loadCompanion = useCallback(async (raw: string): Promise<Companion | null> => {
    const actor = actorParam(raw);
    if (!actor) return null;
    const res = await fetchPublicPalate(actor);
    if (res.status !== 'ok') return null;
    const pours = res.taste?.pours ?? [];
    const terrain = terrainOf(res.taste?.start ?? null, res.palate, pours);
    const ground = sampleTerrain(terrain, 0.5);
    const peak = peaks(terrain, 1)[0] ?? { x: res.palate.x, y: res.palate.y };
    return {
      actor,
      did: res.actor.did,
      handle: res.actor.handle ?? res.actor.did,
      terrain,
      ground,
      aversions: res.palate.aversions,
      point: { x: res.palate.x, y: res.palate.y },
      peak,
      rated: ratingsOf(pours),
    };
  }, []);

  // Load initial overlay params from URL on mount (and on browser Back/Forward).
  useEffect(() => {
    let cancelled = false;
    const hydrateFromUrl = async () => {
      const view = readMapView(new URLSearchParams(window.location.search));
      setDrinkTypeState(view.type);
      const actors = view.table.length > 0 ? view.table : view.with ? [view.with] : [];
      setExploreMode(view.lens === 'explore' && actors.length === 0);
      if (actors.length === 0) {
        setCompanions([]);
        return;
      }
      setLoading(true);
      const loaded = (await Promise.all(actors.map((a) => loadCompanion(a)))).filter(
        (c): c is Companion => c !== null
      );
      if (!cancelled) {
        setCompanions(loaded);
        setLoading(false);
      }
    };
    void hydrateFromUrl();
    const onPop = () => void hydrateFromUrl();
    window.addEventListener('popstate', onPop);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', onPop);
    };
  }, [loadCompanion]);

  const addCompanion = useCallback(
    async (raw: string): Promise<boolean> => {
      const actor = actorParam(raw);
      if (!actor) {
        setError(copy.notFound(raw.trim() || raw));
        return false;
      }
      if (companions.length >= MAX_COMPANIONS) {
        setError(copy.maxTable);
        return false;
      }
      if (companions.some((c) => c.handle === actor || c.did === actor || c.actor === actor)) {
        setError(copy.alreadyAdded(`@${actor}`));
        return false;
      }
      setLoading(true);
      setError(null);
      const found = await loadCompanion(actor);
      setLoading(false);
      if (!found) {
        setError(copy.notFound(`@${actor}`));
        return false;
      }
      const next = [...companions, found];
      setCompanions(next);
      setExploreMode(false);
      syncUrl(next, false, drinkType);
      return true;
    },
    [companions, drinkType, loadCompanion, syncUrl]
  );

  const removeCompanion = useCallback(
    (didOrHandle: string) => {
      const next = companions.filter((c) => c.did !== didOrHandle && c.handle !== didOrHandle);
      setCompanions(next);
      setError(null);
      syncUrl(next, exploreMode && next.length === 0, drinkType);
    },
    [companions, drinkType, exploreMode, syncUrl]
  );

  const clearCompanions = useCallback(() => {
    setCompanions([]);
    setError(null);
    syncUrl([], exploreMode, drinkType);
  }, [drinkType, exploreMode, syncUrl]);

  const toggleExplore = useCallback(() => {
    const next = !exploreMode;
    setExploreMode(next);
    if (next) setCompanions([]);
    setError(null);
    syncUrl(next ? [] : companions, next, drinkType);
  }, [companions, drinkType, exploreMode, syncUrl]);

  const setDrinkType = useCallback(
    (next: DrinkType | null) => {
      const resolved = drinkType === next ? null : next;
      setDrinkTypeState(resolved);
      syncUrl(companions, exploreMode, resolved);
    },
    [companions, drinkType, exploreMode, syncUrl]
  );

  const clearAll = useCallback(() => {
    setCompanions([]);
    setExploreMode(false);
    setDrinkTypeState(null);
    setError(null);
    syncUrl([], false, null);
  }, [syncUrl]);

  const lens: ActiveLens =
    companions.length >= 2
      ? 'table'
      : companions.length === 1
        ? 'with'
        : exploreMode
          ? 'explore'
          : 'self';

  const filteredPool = useMemo(() => filterDrinksByType(drinkDatabase, drinkType), [drinkType]);

  // 1-on-1 comparison when `lens === 'with'`
  const comparison = useMemo(() => {
    if (lens !== 'with' || !mySide || !companions[0]) return null;
    const friend = companions[0];
    return compareWith(mySide, {
      kind: 'person',
      side: { terrain: friend.terrain, aversions: friend.aversions, point: friend.point },
    });
  }, [lens, mySide, companions]);

  // Table members: you (if placed) + all companions
  const tableMembers = useMemo<TableMember[]>(() => {
    const list: TableMember[] = [];
    if (mySide) {
      list.push({
        id: 'self',
        label: myLabel,
        terrain: mySide.terrain,
        aversions: mySide.aversions,
        rated: myRated,
      });
    }
    for (const c of companions) {
      list.push({
        id: c.did,
        label: `@${c.handle}`,
        terrain: c.terrain,
        aversions: c.aversions,
        rated: c.rated,
      });
    }
    return list;
  }, [mySide, myLabel, myRated, companions]);

  const tablePicks = useMemo(
    () => (lens === 'table' || lens === 'with' ? rankForTable(tableMembers, filteredPool, 8) : []),
    [lens, tableMembers, filteredPool]
  );

  const tableContrast = useMemo(
    () => (lens === 'table' ? widestContrastPair(tableMembers) : null),
    [lens, tableMembers]
  );

  // Uncharted frontier when `lens === 'explore'`
  const frontier = useMemo(() => {
    if (lens !== 'explore' || !mySide) return null;
    return exploreFrontier(mySide.terrain, mySide.aversions, myRated, mySide.point, filteredPool, 5);
  }, [lens, mySide, myRated, filteredPool]);

  // Secondary contour layer for `PalateMap.against`
  const againstGround = useMemo(() => {
    if (lens === 'with' && companions[0]) return companions[0].ground;
    if (lens === 'table') {
      const grounds = [...(myGround ? [myGround] : []), ...companions.map((c) => c.ground)];
      return intersectGrounds(grounds);
    }
    return null;
  }, [lens, companions, myGround]);

  // Peak dots for companions in `table` mode
  const companionPoints = useMemo(() => {
    if (lens !== 'table') return undefined;
    return companions.map((c) => ({
      x: c.peak.x,
      y: c.peak.y,
      label: `@${c.handle}`,
      caption: `@${c.handle}`,
      tone: 'theirs' as const,
    }));
  }, [lens, companions]);

  // Comparing with someone or picking for a table draws what the comparison names: where you part,
  // the one for both, and the table's picks (`comparedDrinks`). Null when not comparing.
  const comparedNames = useMemo<string[] | null>(
    () => (lens === 'with' || lens === 'table' ? comparedDrinks(comparison, tablePicks).map((d) => d.name) : null),
    [lens, comparison, tablePicks]
  );

  // What `PalateMap` draws in place of the staples when comparing, a type filter or the explore lens is on.
  // A type can hold more drinks than the map shows: capped, highest on your ground kept.
  const focusDrinks = useMemo<ReadonlySet<string> | null>(() => {
    if (comparedNames) return new Set(comparedNames);
    if (lens === 'explore' && frontier) {
      return new Set([...frontier.nearUntried, ...frontier.pastEdge].map((d) => d.name));
    }
    if (drinkType) {
      const ordered = mySide ? rankByTerrain(mySide.terrain, filteredPool).map((r) => r.drink) : filteredPool;
      return new Set(capMarks(ordered).map((d) => d.name));
    }
    return null;
  }, [comparedNames, lens, frontier, drinkType, filteredPool, mySide]);

  return {
    lens,
    drinkType,
    setDrinkType,
    companions,
    addCompanion,
    removeCompanion,
    clearCompanions,
    toggleExplore,
    clearAll,
    loading,
    error,
    clearError: () => setError(null),
    hasAny: lens !== 'self' || drinkType !== null,
    filteredPool,
    comparison,
    tableMembers,
    tablePicks,
    tableContrast,
    frontier,
    againstGround,
    companionPoints,
    focusDrinks,
    comparedNames,
  };
}

export type OverlaysState = ReturnType<typeof useOverlays>;
