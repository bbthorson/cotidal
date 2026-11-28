import { explore } from '@/lib/copy';
import { DrinkRow } from './DrinkRow';
import { Empty } from './ui';

/**
 * Drinks in order, numbered from 1: the one way a ranked list is drawn in the
 * card (Again, New, the table's picks, the edge of what you know, a bar's
 * menu). `lead` puts the first in terracotta, yours above all. Drinks you have
 * rated show their latest rating ("Manhattan · 9").
 */
export function RankedList({
  drinks,
  name,
  selected,
  lead = false,
  empty,
  onChoose,
  onHover,
}: {
  /** Each drink's name, what put it there, and optional latest 1–9 rating. */
  drinks: readonly { name: string; note: string; rating?: number }[];
  name: (drinkName: string) => string;
  /** The drink shown: the map's, or the one chosen on a menu. */
  selected: string | null | undefined;
  lead?: boolean;
  /** Said in place of the list when it has nothing; without it, nothing is drawn. */
  empty?: string;
  onChoose: (drinkName: string) => void;
  onHover?: (drinkName: string | null) => void;
}) {
  if (drinks.length === 0) return empty ? <Empty>{empty}</Empty> : null;
  return (
    <ol>
      {drinks.map((d, i) => (
        <DrinkRow
          key={d.name}
          rank={i + 1}
          title={d.rating !== undefined ? explore.ratedMark(name(d.name), d.rating) : name(d.name)}
          note={d.note}
          selected={selected === d.name}
          lead={lead && i === 0}
          onSelect={() => onChoose(d.name)}
          onHover={onHover && ((on) => onHover(on ? d.name : null))}
        />
      ))}
    </ol>
  );
}
