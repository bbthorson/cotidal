import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { drinkDatabase } from '@/lib/data';
import { addMenuLine, addMenuLines, type MenuItem, type RankedDrink } from '@/lib/menu-rank';
import { clashingAversions } from '@/lib/ingredient-match';
import { chart, compass, explore, mcp, menu } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { Venue } from '@/hooks/useExplore';
import { questionsHref } from '@/lib/site-nav';
import { cn } from '@/lib/utils';
import { DrinkRow } from './DrinkRow';
import { Empty, ScreenHeader } from './ui';

/**
 * A bar open on the map, in the card: a bar's menu, or one with no bar. Type
 * or paste what they pour (each line is matched to the map, `addMenuLine` /
 * `addMenuLines`) and each placed drink becomes a numbered pin on your map,
 * ranked for you (`rankMenu`, done by `useExplore` so the map and this list
 * agree); pick one. Unplaced house cocktails still warn on avoided flavours
 * and hint at close classics when ingredients are present. The pick is kept
 * on the device as a waiting pick. It orders nothing: Cotidal is not
 * connected to the bar.
 */
export function MenuView({
  venue,
  register,
  profile,
  items,
  setItems,
  typedBar,
  setTypedBar,
  ranked,
  reasonFor,
  onBack,
  onPick,
}: {
  venue: Venue;
  register: Register;
  profile: UserProfile | null;
  items: MenuItem[];
  setItems: Dispatch<SetStateAction<MenuItem[]>>;
  /** A menu with no bar to start from can still say which bar it is. */
  typedBar: string;
  setTypedBar: (name: string) => void;
  /** The menu's placed drinks, ranked: the pins on the map, numbered the same. */
  ranked: RankedDrink[];
  reasonFor: (drink: RankedDrink['drink']) => string;
  onBack: () => void;
  onPick: (drinkName: string) => void;
}) {
  const [entry, setEntry] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);

  const bar = (venue.name ?? typedBar).trim() || null;
  const chosen = choice ?? ranked[0]?.drink.name;
  const aversions = useMemo(
    () => ({
      smoke: profile?.dislikesSmoke ?? false,
      bitter: profile?.dislikesBitter ?? false,
      anise: profile?.dislikesAnise ?? false,
    }),
    [profile]
  );

  const add = () => {
    setItems((prev) => addMenuLine(prev, entry, register));
    setEntry('');
  };

  const addBulk = () => {
    setItems((prev) => addMenuLines(prev, pasteText, register));
    setPasteText('');
    setPasting(false);
  };

  const pick = () => {
    if (chosen) onPick(chosen);
  };

  return (
    <div className="pb-6 motion-safe:animate-in motion-safe:fade-in">
      <button type="button" onClick={onBack} className="link-caps mb-2 flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {explore.backToStart}
      </button>
      <ScreenHeader
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

          {!pasting ? (
            <button
              type="button"
              onClick={() => setPasting(true)}
              aria-expanded={false}
              className="link-caps mt-2 text-secondary hover:underline hover:underline-offset-4"
            >
              {/* "+": it opens here. "→" is for what goes somewhere ("Have a menu? →"). */}
              {compass.atMenu.pasteToggle} +
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addBulk();
              }}
              className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
            >
              <label className="flex flex-col gap-1.5">
                <span className="label-caps">{compass.atMenu.pasteLabel}</span>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={compass.atMenu.pastePlaceholder}
                  rows={5}
                  className="field py-2.5"
                />
              </label>
              <div className="flex items-center gap-4">
                <button type="submit" className="btn btn-outline px-4">
                  {compass.atMenu.pasteAdd}
                </button>
                <button
                  type="button"
                  onClick={() => setPasting(false)}
                  className="link-caps text-muted-foreground hover:text-foreground"
                >
                  {compass.atMenu.pasteCancel}
                </button>
              </div>
            </form>
          )}

          {items.length > 0 && (
            <ul className="mt-4 border-t border-foreground">
              {items.map((item) => {
                const clashes = !item.drink
                  ? clashingAversions(`${item.label} ${item.description ?? ''}`, aversions).map((k) => mcp.flavours[k])
                  : [];
                return (
                  <li key={item.label} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
                    <div className="mr-auto min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="font-serif text-prose font-bold text-foreground">{item.label}</span>
                        <span className={cn('text-meta', item.drink ? 'text-secondary' : 'text-muted-foreground')}>
                          {item.drink ? compass.atMenu.placed : compass.atMenu.unplaced}
                        </span>
                        {item.relative && (
                          <span className="text-meta text-muted-foreground">
                            {compass.atMenu.nearClassic(titleOf(register, item.relative.name))}
                          </span>
                        )}
                        {clashes.length > 0 && (
                          <span className="text-meta font-semibold text-primary">
                            {compass.atMenu.clashes(clashes)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="truncate text-meta text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={compass.atMenu.remove(item.label)}
                      onClick={() => setItems((prev) => prev.filter((i) => i !== item))}
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-foreground"
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-meta text-muted-foreground">{compass.atMenu.photoLater}</p>

          {ranked.length > 0 && (
            <section className="mt-6">
              <h2 className="section-title">{bar ? compass.atMenu.rankedAt(bar) : compass.atMenu.rankedHome}</h2>
              <p className="mb-2 text-meta text-muted-foreground">{compass.atMenu.rankedBody}</p>
              <ol className="border-t border-foreground">
                {ranked.map(({ drink }, i) => (
                  <li key={drink.name} className="border-b border-border">
                    <DrinkRow
                      rank={i + 1}
                      title={titleOf(register, drink.name)}
                      note={reasonFor(drink)}
                      selected={chosen === drink.name}
                      onSelect={() => setChoice(drink.name)}
                    />
                  </li>
                ))}
              </ol>
              <button type="button" onClick={pick} className="btn btn-primary mt-6 w-full">
                {chart.pickThis}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
