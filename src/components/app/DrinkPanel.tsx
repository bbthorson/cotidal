import { drinkDatabase, type Drink } from '@/lib/drinks/data';
import type { PourRecord } from '@/lib/atproto/records';
import { chart, compare as compareCopy, compass, drinks, explore, pour, quadrants } from '@/lib/copy';
import { formatCoordinate } from '@/lib/map/coordinates';
import { quadrantFor, regionPath, type QuadrantId } from '@/lib/map/coordinates';
import { questionsHref } from '@/lib/site-nav';
import type { Register } from '@/lib/drinks/register';
import { usePrerendered } from '@/hooks/usePrerendered';
import { drinkEntryPath, type DrinkEntryData } from '@/lib/drinks/drink-entry';
import { compareWith, type Side } from '@/lib/palate/compare';
import { neighboursOf } from '@/lib/map/map-draw';
import type { Venue } from '@/hooks/useExplore';
import { Comparison } from './Comparison';
import { DrinkEntry } from './DrinkEntry';
import { Readout, ScreenHeader } from './ui';

export interface DrinkPanelProps {
  drink: Drink;
  initialEntry: DrinkEntryData | null;
  register: Register;
  name: (drinkName: string) => string;
  cold: boolean;
  side: Side | null;
  reason: string;
  lastPour: PourRecord | undefined;
  sameSpot: Drink[];
  venue: Venue | null;
  atBar: boolean;
  regionOpen: QuadrantId | null;
  onClose: () => void;
  onChooseDrink: (drinkName: string) => void;
  onRate: (drinkName: string) => void;
  onPick: (drinkName: string) => void;
  onQuiz: () => void;
}

/**
 * A drink, opened in the card: where it sits, what put it where it stands for
 * you, your last pour of it, what shares its spot, and the two things to do —
 * rate it (in the card) or keep it as your pick.
 */
export function DrinkPanel({
  drink,
  initialEntry,
  register,
  name,
  cold,
  side,
  reason,
  lastPour,
  sameSpot,
  venue,
  atBar,
  regionOpen,
  onClose,
  onChooseDrink,
  onRate,
  onPick,
  onQuiz,
}: DrinkPanelProps) {
  const slug = register[drink.name]?.slug;
  const entry = usePrerendered(slug ? drinkEntryPath(slug) : null, initialEntry && { path: drinkEntryPath(initialEntry.slug), data: initialEntry });
  const regionLabel = regionOpen ? quadrants.find((q) => q.id === regionOpen) : null;
  const neighbours = neighboursOf(drink, drinkDatabase, 5).map((n) => ({ ...n, title: name(n.name) }));
  const region = quadrantFor(drink.x, drink.y);
  const lastLine = lastPour
    ? [
        pour.scoreOf(lastPour.rating.hedonic),
        lastPour.isHomePour ? pour.home : lastPour.venue?.entity?.name,
        new Date(lastPour.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div className="pt-1">
      <button type="button" onClick={onClose} className="link-caps flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {venue?.name ?? (venue ? compass.atMenu.homeTitle : (regionLabel?.name ?? explore.backToStart))}
      </button>
      <ScreenHeader title={name(drink.name)} gloss={cold || !side ? chart.coldDrinkPrompt : undefined}>
        <Readout
          className="mt-4"
          cells={[
            { label: drinks.coordinateLabel, value: formatCoordinate(drink.x, drink.y), figure: true },
            { label: region.axis, value: region.name, href: regionPath(region.id) },
          ]}
        />
      </ScreenHeader>

      {side && (
        <Comparison
          comparison={compareWith(side, { kind: 'drink', drink })}
          whose={compareCopy.yours}
          who={compareCopy.you}
          reason={reason}
        />
      )}

      {lastLine && (
        <dl className="mt-3 border-t border-border pt-1">
          <div className="dot-leader py-1.5">
            <dt className="text-meta text-muted-foreground">{chart.lastPour}</dt>
            <span aria-hidden="true" className="leader" />
            <dd className="font-condensed text-ui font-semibold">{lastLine}</dd>
          </div>
        </dl>
      )}

      {sameSpot.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label-caps">{chart.sameSpot}</span>
          {sameSpot.map((d) => (
            <button key={d.name} type="button" onClick={() => onChooseDrink(d.name)} className="chip">
              {name(d.name)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {cold ? (
          <>
            <a
              href={questionsHref}
              onClick={(ev) => {
                // In place: the drink stays open, and is where the questions finish.
                ev.preventDefault();
                onQuiz();
              }}
              className="btn btn-primary w-full"
            >
              {chart.findYours}
            </a>
            <button type="button" onClick={() => onRate(drink.name)} className="btn btn-outline w-full">
              {chart.logThis}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onRate(drink.name)} className="btn btn-primary w-full">
              {chart.logThis}
            </button>
            <button type="button" onClick={() => onPick(drink.name)} className="btn btn-outline w-full">
              {atBar ? compass.pickAt(venue?.name ?? '') : chart.pickThis}
            </button>
          </>
        )}
      </div>

      {entry?.name === drink.name && <DrinkEntry entry={entry} neighbours={neighbours} onSelect={onChooseDrink} />}
    </div>
  );
}
