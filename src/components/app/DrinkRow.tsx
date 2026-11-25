import { cn } from '@/lib/utils';

/**
 * A row of a list under the chart: the whole row selects the drink. A figure
 * (how far) sits at the end on a dot leader; a note (what put a drink on your
 * menu) sits under the name instead.
 */
export function DrinkRow({
  rank,
  title,
  figure,
  figureLabel,
  note,
  selected,
  onSelect,
}: {
  rank?: number;
  title: string;
  figure?: string | number;
  figureLabel?: string;
  note?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  if (note !== undefined) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left focus-ring-inset"
      >
        {rank !== undefined && (
          <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{rank}</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
              selected ? 'text-primary' : 'text-foreground'
            )}
          >
            {title}
          </span>
          <span className="text-meta text-muted-foreground">{note}</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="dot-leader min-h-11 w-full py-3 text-left focus-ring-inset"
    >
      {rank !== undefined && (
        <span className="w-5.5 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{rank}</span>
      )}
      <span
        className={cn(
          'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {title}
      </span>
      <span aria-hidden="true" className="leader" />
      <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums" aria-label={figureLabel}>
        {figure}
      </span>
    </button>
  );
}
