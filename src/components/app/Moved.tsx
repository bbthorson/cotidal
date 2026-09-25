import { useEffect, useRef } from 'react';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { describeMove } from '@/lib/coordinate';
import { moved } from '@/lib/copy';
import { CoordinateMap, DrinkDot, TraceMark, YouMark } from './CoordinateMap';

interface MovedProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  drinkName: string;
  /** 0–10, as entered in the log form. */
  rating: number;
  /** Where the logged drink now sits on the go-to menu, if it is on it. */
  rank: number | null;
  /** A drink that was not on the go-to menu before this pour and is now. */
  newcomer: string | null;
  displayName: (name: string) => string;
  onDone: () => void;
}

/**
 * After a pour (Flow Recommendations, R6). The payoff of signing in, shown
 * every time: where you were, where you are, what changed on the menu. The
 * second and last use of the ink ground.
 */
export function Moved({ from, to, drinkName, rating, rank, newcomer, displayName, onDone }: MovedProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const before = quadrantFor(from.x, from.y);
  const after = quadrantFor(to.x, to.y);
  const drink = drinkDatabase.find((d) => d.name.toLowerCase() === drinkName.toLowerCase());
  const score = Number.isInteger(rating) ? `${rating}` : rating.toFixed(1);

  const rows: { name: string; note: string }[] = [
    { name: displayName(drink?.name ?? drinkName), note: rank ? moved.rankOnMenu(rank) : moved.offMenu },
  ];
  if (newcomer) rows.push({ name: displayName(newcomer), note: moved.newOnMenu });

  return (
    <div
      data-focus-mode
      className="-mx-6 flex min-h-dvh flex-col bg-reveal px-6 pb-8 pt-14 text-reveal-foreground lg:mx-auto lg:my-6 lg:min-h-0 lg:max-w-md lg:pt-12"
    >
      <div className="flex flex-col gap-2.5">
        <span className="font-condensed text-xs font-semibold uppercase tracking-label text-reveal-muted">
          {moved.eyebrow} · {displayName(drink?.name ?? drinkName)} · {score} of 10
        </span>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-hero font-normal italic outline-none">
          {moved.title}
        </h1>
        <p className="mt-1 font-serif text-prose">
          {describeMove(from, to)} {before.id === after.id ? moved.stillIn : moved.nowIn} {after.name}.
        </p>
      </div>

      <CoordinateMap tone="ink" you={to} className="mt-7">
        <TraceMark from={from} to={to} tone="ink" />
        <YouMark x={to.x} y={to.y} tone="ink" land label={`Your coordinate, now in ${after.name}`} />
        {drink && <DrinkDot x={drink.x} y={drink.y} tone="ink" filled label={displayName(drink.name)} />}
      </CoordinateMap>

      <ul className="mt-4.5 border-t border-reveal-muted/40">
        {rows.map((row) => (
          <li key={row.name} className="dot-leader border-b border-reveal-muted/25 py-3">
            <span className="font-serif text-base font-bold">{row.name}</span>
            <span aria-hidden="true" className="leader leader-reveal" />
            <span className="font-condensed text-sm font-semibold tracking-widest text-reveal-muted">{row.note}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onDone}
        className="mt-auto min-h-13 w-full border border-reveal-foreground bg-reveal-foreground font-condensed text-sm font-bold uppercase tracking-label text-reveal transition-colors hover:bg-reveal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reveal-mark focus-visible:ring-offset-2 focus-visible:ring-offset-reveal lg:mt-8"
      >
        {moved.back}
      </button>
    </div>
  );
}
