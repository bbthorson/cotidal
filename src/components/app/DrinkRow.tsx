import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One thing in a list — a drink, a bar, a person, a pour — and the only way a
 * list row is drawn (docs/design-system.md, One row). It is the `<li>`, with
 * the hairline under it, so a list is an `<ol>` or `<ul>` of these under a
 * `SectionTitle`.
 *
 *   rank   · title · · · · · · · · figure
 *            note
 *            children (tags, a quote)
 *
 * The whole row is the target: a link with `href`, a button with `onSelect`,
 * or plain text with neither. Rendered on the server with no directive as
 * well as in the island, so `/drinks` and `/` draw the same row.
 */
export function DrinkRow({
  rank,
  title,
  figure,
  figureLabel,
  note,
  children,
  selected = false,
  lead = false,
  href,
  onSelect,
  onHover,
}: {
  /** A number in the margin: a place on a menu, or a pour's count. */
  rank?: ReactNode;
  title: ReactNode;
  /** At the end of the title's line, on a dot leader: how far, a coordinate, a rating. */
  figure?: ReactNode;
  figureLabel?: string;
  /** One line under the title: why it is here, where and when. */
  note?: ReactNode;
  children?: ReactNode;
  /** The one the map is showing: the title in terracotta. */
  selected?: boolean;
  /** The first of your menu, yours above all: terracotta too, without being the one shown. */
  lead?: boolean;
  href?: string;
  onSelect?: () => void;
  onHover?: (on: boolean) => void;
}) {
  const body = (
    <>
      {rank !== undefined && (
        <span className="w-5.5 shrink-0 font-condensed text-meta font-bold tabular-nums text-muted-foreground">{rank}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="dot-leader">
          <span
            className={cn(
              'font-serif text-prose font-bold transition-colors',
              (href || onSelect) && 'group-hover:underline group-hover:underline-offset-4',
              selected || lead ? 'text-primary' : 'text-foreground'
            )}
          >
            {title}
          </span>
          {figure !== undefined && (
            <>
              <span aria-hidden="true" className="leader" />
              <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums" aria-label={figureLabel}>
                {figure}
              </span>
            </>
          )}
        </span>
        {note !== undefined && <span className="text-meta text-muted-foreground">{note}</span>}
        {children}
      </span>
    </>
  );
  const row = 'group flex min-h-11 w-full items-baseline gap-3 py-3 text-left';
  return (
    <li className="border-b border-border">
      {href ? (
        <a href={href} className={cn(row, 'focus-ring-inset')} aria-current={selected || undefined}>
          {body}
        </a>
      ) : onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={onHover && (() => onHover(true))}
          onMouseLeave={onHover && (() => onHover(false))}
          aria-pressed={selected}
          className={cn(row, 'focus-ring-inset')}
        >
          {body}
        </button>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}
