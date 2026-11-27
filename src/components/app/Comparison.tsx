import type { ReactNode } from 'react';
import type { Comparison as ComparisonData } from '@/lib/palate/compare';
import { compare as copy, publicMap } from '@/lib/copy';
import type { Drink } from '@/lib/drinks/data';
import { TOP } from '@/lib/palate/overlap';
import { DrinkRow } from './DrinkRow';
import { Readout, SectionTitle } from './ui';

/**
 * A drink or a person against a taste, said the same way (`compareWith`,
 * docs/design-system.md, One comparison): how far and which way from the
 * taste's nearest hill, whether it is reached for, and the ratings behind
 * that. A person adds where the two part, as rows — each a drink, opened as
 * any drink is.
 */
export function Comparison({
  comparison: c,
  whose,
  who,
  other,
  reason,
  pair,
  name = (n) => n,
}: {
  comparison: ComparisonData;
  /** "your", or "@alice’s". */
  whose: string;
  /** "you", or "@alice". */
  who: string;
  /** A person's: who they are, as `who` is said ("@bob", or "you"). */
  other?: string;
  /** A drink's: what put it where it stands (`chart.reason` or `publicMap.reason`). */
  reason?: string;
  /** A person's: where the two part, as `DrinkRow` props for each drink (its title, and a link or a tap). */
  pair?: (drink: Drink) => { title: ReactNode; href?: string; onSelect?: () => void };
  /** A drink's printed name (`titleOf`). */
  name?: (drinkName: string) => string;
}) {
  const them = other ?? publicMap.them.toLowerCase();
  const parts = c.overlap
    ? [
        { label: publicMap.onlyLabel(capital(who), them), drink: c.overlap.firstOnly },
        { label: publicMap.onlyLabel(capital(them), who), drink: c.overlap.secondOnly },
        { label: publicMap.bothLabel, drink: c.overlap.shared },
      ].flatMap(({ label, drink }) => (drink ? [{ label, drink }] : []))
    : [];
  return (
    <section data-testid="comparison" data-kind={c.kind} className="mt-6">
      <SectionTitle as="h2">{copy.title(whose)}</SectionTitle>
      <Readout
        className="border-t-0"
        cells={[
          { label: copy.fromLabel, value: c.distance, figure: true },
          { label: copy.wayLabel, value: c.words },
        ]}
      />
      <p className="mt-3 font-serif text-ui italic text-secondary">
        {c.kind === 'drink' ? copy.drinkReach(who, c.reach) : publicMap.inCommon(c.inCommon ?? 0, TOP)}
      </p>
      <p className="mt-1 text-meta text-muted-foreground">{c.kind === 'drink' ? reason : copy.personBehind(whose, c.behind.map((b) => ({ ...b, name: name(b.name) })))}</p>
      {parts.length > 0 && pair && (
        <ul className="mt-4 border-t border-border">
          {parts.map(({ label, drink }) => (
            <DrinkRow key={label} {...pair(drink)} note={label} />
          ))}
        </ul>
      )}
    </section>
  );
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
