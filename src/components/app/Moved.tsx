import { useEffect, useRef } from 'react';
import { matchDrink } from '@/lib/drinks/search';
import { describeMove, distanceBetween, quadrantFor } from '@/lib/map/coordinates';
import { DISLIKED_AT, LIKED_AT } from '@/lib/palate/scoring';
import { moved } from '@/lib/copy';

interface MovedProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  drinkName: string;
  /** The 1–9 hedonic point tapped, used to report how the pour shaped the terrain. */
  hedonic?: number;
  /** "7 of 9" */
  scoreLabel: string;
  /**
   * What the pour did to the go-to menu, where there is one (in the rating sheet): the
   * logged drink's new rank, and a drink that was not on it before.
   */
  menuChange?: { rank: number | null; newcomer: string | null };
  displayName?: (name: string) => string;
  backLabel?: string;
  onDone: () => void;
}

/**
 * After a pour, in the rating sheet. The payoff of logging, shown every time:
 * how far it moved you ("Moved 0.7", or "Held." for a rating in the middle),
 * which way, how it reshaped your ground, and what changed on the menu.
 */
const same = (name: string) => name;

export function Moved({
  from,
  to,
  drinkName,
  hedonic,
  scoreLabel,
  menuChange,
  displayName = same,
  backLabel = moved.back,
  onDone,
}: MovedProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const before = quadrantFor(from.x, from.y);
  const after = quadrantFor(to.x, to.y);
  const drink = matchDrink(drinkName);
  // A drink the map has no point for moves nothing (unless a deviation did): say why, not "barely a step".
  const stayed = !drink && from.x === to.x && from.y === to.y;
  // How far, as the log says it. A drink on the map that moved you nowhere was rated in the middle.
  const distance = distanceBetween(from, to);
  const held = !stayed && distance === 0;
  const drinkRegion = drink ? quadrantFor(drink.x, drink.y) : null;
  const groundNote =
    drinkRegion && hedonic !== undefined
      ? hedonic >= LIKED_AT
        ? moved.groundRaised(drinkRegion.name)
        : hedonic <= DISLIKED_AT
          ? moved.groundLowered(drinkRegion.name)
          : null
      : null;

  const rows: { name: string; note: string }[] = [];
  // A drink with no point has no place on the menu to report.
  if (menuChange && drink) {
    rows.push({
      name: displayName(drink?.name ?? drinkName),
      note: menuChange.rank ? moved.rankOnMenu(menuChange.rank) : moved.offMenu,
    });
    if (menuChange.newcomer) rows.push({ name: displayName(menuChange.newcomer), note: moved.newOnMenu });
  }

  return (
    <div data-focus-mode className="flex flex-col pb-2 pt-6">
      <div className="flex flex-col gap-2.5">
        <span className="label-caps text-reveal-muted">
          {moved.eyebrow} · {displayName(drink?.name ?? drinkName)} · {scoreLabel}
        </span>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-hero font-normal italic outline-none">
          {stayed ? moved.unlistedTitle : held ? moved.heldTitle : moved.title(distance)}
        </h1>
        <p className="mt-1 font-serif text-prose">
          {stayed ? (
            <>
              {moved.unlisted(drinkName)} {moved.stillIn} {after.name}.
            </>
          ) : held ? (
            <>
              {moved.held} {moved.stillIn} {after.name}.
            </>
          ) : (
            <>
              {describeMove(from, to)} {before.id === after.id ? moved.stillIn : moved.nowIn} {after.name}.
            </>
          )}
        </p>
        {groundNote && <p className="text-meta text-reveal-muted">{groundNote}</p>}
      </div>

      {rows.length > 0 && (
        <ul className="mt-6 border-t border-reveal-rule">
          {rows.map((row) => (
            <li key={row.name} className="dot-leader border-b border-reveal-hairline py-3">
              <span className="font-serif text-prose font-bold">{row.name}</span>
              <span aria-hidden="true" className="leader leader-reveal" />
              {/* What a reader reads is sentence case in PT Sans; caps are for structure. */}
              <span className="shrink-0 font-body text-meta text-reveal-muted">{row.note}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onDone}
        className="btn btn-reveal btn-lg mt-8 w-full"
      >
        {backLabel}
      </button>
    </div>
  );
}
