import { quadrants, regionPage as copy } from '@/lib/copy';
import type { RegionEntryData } from '@/lib/region-entry';
import { OnTheRecord } from './OnTheRecord';
import { SectionTitle } from './ui';

/**
 * A region's write-up, under its drinks in the map's card: its prose, what
 * a coordinate here says about you, what its drinks share, and what is on
 * the record.
 */
export function RegionEntry({ entry }: { entry: RegionEntryData }) {
  const region = quadrants.find((q) => q.id === entry.id)!;
  return (
    <article data-testid="region-entry" className="mt-10">
      <SectionTitle>{copy.aboutLabel(region.name)}</SectionTitle>
      {entry.html && (
        // Written at build time from the region's own Markdown, never from a reader.
        <div className="prose-entry py-8" dangerouslySetInnerHTML={{ __html: entry.html }} />
      )}

      <section className="pb-10">
        <SectionTitle as="h3">{copy.orderingLabel}</SectionTitle>
        <p className="mt-4 font-serif text-ui leading-relaxed text-foreground">{copy.ordering(region.name, region.axis)}</p>
      </section>

      {entry.shared.length > 0 && (
        <section className="pb-10">
          <SectionTitle as="h3">{copy.sharedLabel}</SectionTitle>
          <ul className="border-b border-border">
            {entry.shared.map((ingredient) => (
              <li key={ingredient.name} className="menu-row dot-leader py-2.5 first:border-t-0">
                <span className="font-serif text-ui text-foreground">{ingredient.name}</span>
                <span className="leader" aria-hidden="true" />
                <span className="shrink-0 font-condensed text-ui tabular-nums text-secondary">
                  {copy.sharedCount(ingredient.count, entry.writtenUp)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-serif text-ui italic leading-relaxed text-muted-foreground">{copy.sharedNote(entry.writtenUp)}</p>
        </section>
      )}

      {entry.documented.length > 0 && <OnTheRecord documented={entry.documented} claimed={entry.claimed} sources={entry.sources} />}
    </article>
  );
}
