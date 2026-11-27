import type { DrinkEntryData } from '@/lib/drinks/drink-entry';
import { formatCoordinate } from '@/lib/map/coordinates';
import { drinks as copy } from '@/lib/copy';
import { DrinkRow } from './DrinkRow';
import { OnTheRecord } from './OnTheRecord';
import { SectionTitle } from './ui';

export interface Neighbour {
  name: string;
  title: string;
  x: number;
  y: number;
  /** On a page with no script, its own page; on the map, nothing — `onSelect` opens it in the card. */
  href?: string;
}

/**
 * A drink's write-up, under its head in the card (docs/design-system.md, A
 * drink): the prose, the build, the drinks nearest it on the map, and what is
 * on the record. One component for `/drinks/<slug>` (on the server, no
 * script) and the map's card (`DrinkPanel`, fetched when a drink is opened),
 * so a dot on the map opens the whole entry.
 */
export function DrinkEntry({
  entry,
  neighbours,
  onSelect,
}: {
  entry: DrinkEntryData;
  neighbours: readonly Neighbour[];
  onSelect?: (drinkName: string) => void;
}) {
  return (
    <article data-testid="drink-entry">
      {/* Written at build time from the entry's own Markdown, never from a reader. */}
      <div className="prose-entry py-8" dangerouslySetInnerHTML={{ __html: entry.html }} />

      <section className="pb-8">
        <SectionTitle>{copy.buildLabel}</SectionTitle>
        {entry.ingredients.length > 0 && (
          <ul className="border-b border-border">
            {entry.ingredients.map((i) => (
              <li key={i.name} className="menu-row dot-leader py-2.5 first:border-t-0">
                <span className="font-serif text-ui text-foreground">
                  {i.name}
                  {i.optional && <em className="ml-2 text-meta not-italic text-muted-foreground">{copy.optionalLabel}</em>}
                </span>
                <span className="leader" aria-hidden="true" />
                <span className="shrink-0 font-condensed text-ui tabular-nums text-secondary">{i.amount}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-5 space-y-2.5">
          {(
            [
              [copy.glassLabel, entry.build.glass],
              [copy.methodLabel, entry.build.method],
              [copy.garnishLabel, entry.build.garnish],
            ] as const
          ).map(
            ([label, value]) =>
              value && (
                <div key={label} className="flex gap-4">
                  <dt className="label-caps w-16 shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-meta leading-relaxed text-foreground">{value}</dd>
                </div>
              )
          )}
        </dl>
      </section>

      {neighbours.length > 0 && (
        <section className="pb-8">
          <SectionTitle>{copy.nearLabel}</SectionTitle>
          <ul>
            {neighbours.map((n) => (
              <DrinkRow
                key={n.name}
                href={n.href}
                onSelect={onSelect && (() => onSelect(n.name))}
                title={n.title}
                figure={formatCoordinate(n.x, n.y)}
              />
            ))}
          </ul>
        </section>
      )}

      <OnTheRecord documented={entry.documented} claimed={entry.claimed} sources={entry.sources} />
    </article>
  );
}
