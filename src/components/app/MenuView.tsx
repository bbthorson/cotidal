import { useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { addMenuLine, rankMenu, type MenuItem } from '@/lib/menu-rank';
import { chart, compass, menu } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { questionsHref } from '@/lib/site-nav';
import { savePick, type DrinkPick } from '@/lib/device-store';
import { cn } from '@/lib/utils';
import { DrinkRow } from './Chart';
import { Empty, ScreenHeader } from './ui';

/** Where the menu is. No name means no bar named: at home. `at` is where the map says the bar is. */
export interface Venue {
  name: string | null;
  at?: { lat: number; lon: number };
}

/**
 * A menu, on Compass: a bar's, or one with no bar. Type what they pour (each
 * line is matched to the map, `addMenuLine`), see it ranked for you
 * (`rankMenu`), pick one. The pick is kept on the device as a waiting pick
 * (`savePick`), and rating it opens /rate on a draft (`draftPath`), the same
 * hand-off a chat assistant uses, so the rating is still the member's own tap.
 * It orders nothing: Cotidal is not connected to the bar.
 */
export function MenuView({
  venue,
  register,
  profile,
  pours,
  onBack,
  onPicked,
}: {
  venue: Venue;
  register: Register;
  profile: UserProfile | null;
  pours: PourRecord[];
  onBack: () => void;
  onPicked: (pick: DrinkPick) => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [entry, setEntry] = useState('');
  // A menu with no bar to start from can still say which bar it is.
  const [typedBar, setTypedBar] = useState('');
  const [choice, setChoice] = useState<string | null>(null);

  const bar = (venue.name ?? typedBar).trim() || null;
  const ranked = useMemo(
    () => (profile ? rankMenu(items, profile, pours, bar ?? 'Home Pour') : []),
    [profile, items, pours, bar]
  );
  const chosen = choice ?? ranked[0]?.drink.name;

  const add = () => {
    setItems((prev) => addMenuLine(prev, entry, register));
    setEntry('');
  };

  const pick = () => {
    if (!chosen) return;
    const next: DrinkPick = {
      drink: chosen,
      ...(bar ? { bar } : { atHome: true }),
      ...(bar && venue.at && bar === venue.name ? { at: venue.at } : {}),
      pickedAt: new Date().toISOString(),
    };
    savePick(next);
    onPicked(next);
  };

  return (
    <div className="mx-auto max-w-xl pb-6 pt-6 motion-safe:animate-in motion-safe:fade-in lg:pt-10">
      <button type="button" onClick={onBack} className="link-caps mb-4 flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {compass.atMenu.back}
      </button>
      <ScreenHeader
        eyebrow={compass.title}
        title={venue.name ?? compass.atMenu.homeTitle}
        lede={compass.atMenu.body}
      />

      {!profile ? (
        // Without a coordinate there is nothing to rank against: say what it needs.
        <Empty
          action={
            <a href={questionsHref} className="btn btn-primary w-full px-6">
              {compass.findYours}
            </a>
          }
        >
          {menu.coldBody}
        </Empty>
      ) : (
        <>
          {venue.name === null && (
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="label-caps">{compass.atMenu.barLabel}</span>
              <input
                value={typedBar}
                onChange={(e) => setTypedBar(e.target.value)}
                maxLength={200}
                autoComplete="off"
                className="field min-h-11"
              />
            </label>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="label-caps">{compass.atMenu.addLabel}</span>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                list="menu-drinks"
                placeholder={compass.atMenu.addPlaceholder}
                maxLength={200}
                autoComplete="off"
                className="field min-h-11"
              />
            </label>
            <button type="submit" className="btn btn-outline self-end px-4">
              {compass.atMenu.add}
            </button>
            <datalist id="menu-drinks">
              {drinkDatabase.map((d) => (
                <option key={d.name} value={titleOf(register, d.name)} />
              ))}
            </datalist>
          </form>

          {items.length > 0 && (
            <ul className="mt-4 border-t border-foreground">
              {items.map((item) => (
                <li key={item.label} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
                  <span className="font-serif text-prose font-bold text-foreground">{item.label}</span>
                  <span className={cn('mr-auto text-meta', item.drink ? 'text-secondary' : 'text-muted-foreground')}>
                    {item.drink ? compass.atMenu.placed : compass.atMenu.unplaced}
                  </span>
                  <button
                    type="button"
                    aria-label={compass.atMenu.remove(item.label)}
                    onClick={() => setItems((prev) => prev.filter((i) => i !== item))}
                    className="flex min-h-11 min-w-11 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-foreground"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-meta text-muted-foreground">{compass.atMenu.photoLater}</p>

          {ranked.length > 0 && (
            <section className="mt-6">
              <h2 className="section-title">{bar ? compass.atMenu.rankedAt(bar) : compass.atMenu.rankedHome}</h2>
              <p className="mb-2 text-meta text-muted-foreground">{compass.atMenu.rankedBody}</p>
              <ol className="border-t border-foreground">
                {ranked.map(({ drink, score }, i) => (
                  <li key={drink.name} className="border-b border-border">
                    <DrinkRow
                      rank={i + 1}
                      title={titleOf(register, drink.name)}
                      figure={score}
                      figureLabel={chart.closenessOf(score)}
                      selected={chosen === drink.name}
                      onSelect={() => setChoice(drink.name)}
                    />
                  </li>
                ))}
              </ol>
              <button type="button" onClick={pick} className="btn btn-primary btn-lg mt-6 w-full px-6">
                {chart.pickThis}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
