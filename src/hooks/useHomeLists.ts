import { useMemo } from 'react';
import { compass, overlays as overlayCopy } from '@/lib/copy';
import type { Drink } from '@/lib/drinks/data';
import type { Explore } from './useExplore';
import type { OverlaysState } from './useOverlays';

/** A drink in a ranked list: its name and what put it there. */
export interface RankedEntry {
  name: string;
  note: string;
}

/** One ranked list in where to next, titled. */
export interface HomeList {
  title: string;
  aside?: string;
  drinks: RankedEntry[];
  /** Said when the list is empty; a list without one is left out instead. */
  empty?: string;
  /** The first is yours above all: terracotta. */
  lead: boolean;
}

/**
 * Which ranked lists where to next draws, from the overlays: the table's picks
 * (with someone or a table), the edge of what you know (Uncharted), or your
 * menu (narrowed to a drink type when one is chosen). `menu` is also what the
 * map names.
 */
export function useHomeLists(e: Pick<Explore, 'menu' | 'scored' | 'reasonFor'>, overlays: OverlaysState) {
  const { menu: baseMenu, scored, reasonFor } = e;
  const { lens, drinkType, tableMembers, tablePicks, frontier } = overlays;

  const menu = useMemo<RankedEntry[]>(() => {
    if (!drinkType) return baseMenu.map((d) => ({ name: d.name, note: d.reason }));
    return scored
      .filter((d) => d.type === drinkType)
      .slice(0, 8)
      .map((d) => ({ name: d.name, note: reasonFor(d) }));
  }, [drinkType, baseMenu, scored, reasonFor]);

  const kind = lens === 'table' || lens === 'with' ? 'table' : lens === 'explore' && frontier ? 'explore' : 'menu';

  const lists = useMemo<HomeList[]>(() => {
    const entries = (drinks: readonly Drink[]) => drinks.map((d) => ({ name: d.name, note: reasonFor(d) }));
    if (kind === 'table') {
      return [
        {
          title: overlayCopy.tableTitle(tableMembers.length),
          aside: overlayCopy.tableNote,
          drinks: entries(tablePicks),
          empty: overlayCopy.tableEmpty,
          lead: true,
        },
      ];
    }
    if (kind === 'explore' && frontier) {
      return [
        {
          title: overlayCopy.exploreNearTitle,
          aside: overlayCopy.exploreNearNote,
          drinks: entries(frontier.nearUntried),
          empty: overlayCopy.exploreEmpty,
          lead: true,
        },
        { title: overlayCopy.exploreEdgeTitle, aside: overlayCopy.exploreEdgeNote, drinks: entries(frontier.pastEdge), lead: false },
      ].filter((l) => l.empty || l.drinks.length > 0);
    }
    return [
      {
        title: drinkType ? `${compass.menuTitle} · ${overlayCopy.types[drinkType]}` : compass.menuTitle,
        aside: compass.menuNote,
        drinks: menu,
        empty: compass.noDrinks,
        lead: true,
      },
    ];
  }, [kind, tableMembers.length, tablePicks, frontier, drinkType, menu, reasonFor]);

  return { kind, lists, menu } as const;
}

export type HomeLists = ReturnType<typeof useHomeLists>;
