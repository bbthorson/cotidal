import type { Sourced } from '@/lib/drink-entry';
import { drinks as copy } from '@/lib/copy';
import { SectionTitle } from './ui';

/**
 * The three closing sections of every sourced entry — what is on the record,
 * what is only told, and where it comes from. Drinks and regions share the
 * format (`src/content.config.ts`), so they share this too.
 */
export function OnTheRecord({ documented, claimed, sources }: Sourced) {
  return (
    <>
      <section className="pb-12">
        <SectionTitle>{copy.documentedLabel}</SectionTitle>
        <ul>
          {documented.map((item) => (
            <li key={item.claim} className="menu-row py-4 first:border-t-0">
              <p className="font-serif text-ui leading-relaxed text-foreground">{item.claim}</p>
              <p className="mt-2 text-meta text-secondary">{item.source}</p>
            </li>
          ))}
        </ul>
      </section>

      {claimed.length > 0 && (
        <section className="pb-12">
          <SectionTitle>{copy.claimedLabel}</SectionTitle>
          <ul>
            {claimed.map((item) => (
              <li key={item.claim} className="menu-row py-4 first:border-t-0">
                <p className="font-serif text-meta italic leading-relaxed text-muted-foreground">{item.claim}</p>
                <p className="mt-2 border-t border-border pt-2 text-meta leading-relaxed text-muted-foreground">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pb-12">
        <SectionTitle>{copy.sourcesLabel}</SectionTitle>
        <ul className="mt-3 space-y-2">
          {sources.map((s) => (
            <li key={s.title} className="text-meta leading-relaxed text-muted-foreground">
              {s.url ? (
                <a href={s.url} rel="noopener noreferrer" className="link-inline">
                  {s.title}
                </a>
              ) : (
                <span className="text-foreground">{s.title}</span>
              )}
              {s.author && <span> · {s.author}</span>}
              {s.year && <span className="tabular-nums"> · {s.year}</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
