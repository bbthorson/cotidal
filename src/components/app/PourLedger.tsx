import type { PourRecord, Deviation } from '@/lib/atproto/records';
import type { Register } from '@/lib/register';
import { pour } from '@/lib/copy';

interface PourLedgerProps {
  pours: PourRecord[];
  /** Used to link a pour to its register entry, and to print its tidy name. */
  register?: Register;
  empty: string;
  loading?: boolean;
}

/**
 * What moved it: every pour as a menu row. Name · leader · score, then where
 * and when, then what was off and the note. A list, not a stack of cards.
 */
export function PourLedger({ pours, register = {}, empty, loading = false }: PourLedgerProps) {
  if (loading) {
    return <p className="py-6 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">…</p>;
  }
  if (pours.length === 0) {
    return <p className="border-b border-border py-6 font-serif text-prose italic text-muted-foreground">{empty}</p>;
  }

  return (
    <ol className="border-t border-foreground">
      {pours.map((p, i) => {
        const entry = register[p.drink.name];
        const name = entry?.title ?? p.drink.name;
        const where = p.isHomePour ? pour.home : p.venue?.entity?.name;
        const when = new Date(p.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return (
          <li key={`${p.createdAt}-${i}`} className="flex flex-col gap-1.5 border-b border-border py-3.5">
            <div className="dot-leader">
              {entry ? (
                <a
                  href={`/drinks/${entry.slug}`}
                  className="font-serif text-prose font-bold text-foreground transition-colors hover:text-primary"
                >
                  {name}
                </a>
              ) : (
                <span className="font-serif text-prose font-bold text-foreground">{name}</span>
              )}
              <span aria-hidden="true" className="leader" />
              <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums">
                {pour.scoreOf(p.rating.hedonic)}
              </span>
            </div>
            <p className="text-meta text-muted-foreground">
              {where ? `${where} · ` : ''}
              {when}
              {' · '}
              {pour.hedonic[p.rating.hedonic - 1]}
            </p>
            {p.deviations && p.deviations.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {p.deviations.map((dev) => (
                  <li
                    key={dev}
                    className="border border-border px-2 py-0.5 font-condensed text-xs uppercase tracking-label text-secondary"
                  >
                    {pour.deviations[dev as Deviation] ?? dev}
                  </li>
                ))}
              </ul>
            )}
            {p.cata && p.cata.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {p.cata.map((desc) => (
                  <li
                    key={desc}
                    className="border border-border px-2 py-0.5 font-condensed text-xs uppercase tracking-label text-secondary"
                  >
                    {desc}
                  </li>
                ))}
              </ul>
            )}
            {p.note && <p className="font-serif text-ui italic text-foreground">“{p.note}”</p>}
          </li>
        );
      })}
    </ol>
  );
}
