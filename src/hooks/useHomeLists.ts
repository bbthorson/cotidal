import { useMemo } from 'react';
import { compass, overlays as overlayCopy } from '@/lib/copy';
import type { Drink } from '@/lib/drinks/data';
import { LIKED_AT } from '@/lib/palate/scoring';
import type { Explore } from './useExplore';
import type { OverlaysState } from './useOverlays';

/** A drink in a ranked list: its name, what put it there, and optional latest 1–9 rating. */
export interface RankedEntry {
  name: string;
  note: string;
  rating?: number;
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

const AGAIN_LIMIT = 5;
const NEW_LIMIT = 8;

/**
 * Which ranked lists where to next draws, from the overlays: the table's picks
 * (with someone or a table), the edge of what you know (Uncharted), or two
 * lanes — Again (your highs) and New (untried, ranked for you), narrowed to a
 * drink type when one is chosen. `menu` is also what the map names.
 */
export function useHomeLists(e: Pick<Explore, 'scored' | 'reasonFor' | 'lastPour'>, overlays: OverlaysState) {
  const { scored, reasonFor, lastPour } = e;
  const { lens, drinkType, tableMembers, tablePicks, frontier } = overlays;

  const { again, fresh, menu } = useMemo(() => {
    const pool = drinkType ? scored.filter((d) => d.type === drinkType) : scored;
    const toEntry = (d: Drink): RankedEntry => ({
      name: d.name,
      note: reasonFor(d),
      rating: lastPour.get(d.name)?.rating.hedonic,
    });
    const againEntries = pool
      .filter((d) => (lastPour.get(d.name)?.rating.hedonic ?? 0) >= LIKED_AT)
      .slice(0, AGAIN_LIMIT)
      .map(toEntry);
    const newEntries = pool
      .filter((d) => !lastPour.has(d.name))
      .slice(0, NEW_LIMIT)
      .map(toEntry);
    // What the map names when no search/overlay is active: the top of Again + New (up to 8).
    const namedMenu = [...againEntries, ...newEntries].slice(0, NEW_LIMIT);
    return { again: againEntries, fresh: newEntries, menu: namedMenu };
  }, [drinkType, scored, reasonFor, lastPour]);

  const kind = lens === 'table' || lens === 'with' ? 'table' : lens === 'explore' && frontier ? 'explore' : 'menu';

  const lists = useMemo<HomeList[]>(() => {
    const entries = (drinks: readonly Drink[]): RankedEntry[] =>
      drinks.map((d) => ({
        name: d.name,
        note: reasonFor(d),
        rating: lastPour.get(d.name)?.rating.hedonic,
      }));
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
    const suffix = drinkType ? ` · ${overlayCopy.types[drinkType]}` : '';
    return [
      {
        title: `${compass.againTitle}${suffix}`,
        aside: compass.againNote,
        drinks: again,
        lead: true,
      },
      {
        title: `${compass.newTitle}${suffix}`,
        aside: compass.newNote,
        drinks: fresh,
        empty: compass.noDrinks,
        lead: again.length === 0,
      },
    ].filter((l) => l.empty || l.drinks.length > 0);
  }, [kind, tableMembers.length, tablePicks, frontier, drinkType, again, fresh, reasonFor, lastPour]);

  return { kind, lists, menu } as const;
}

export type HomeLists = ReturnType<typeof useHomeLists>;
