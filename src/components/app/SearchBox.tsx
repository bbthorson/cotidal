import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { compass, explore } from '@/lib/copy';
import { formatDistance } from '@/lib/osm';
import type { Explore } from '@/hooks/useExplore';
import { cn } from '@/lib/utils';

/** Where the app bar keeps its search (`AppBar`'s `search`): a plain form until the map takes it over. */
export const SEARCH_HOST_ID = 'app-search';

/**
 * The one search, in the app bar at the top of the card: drinks by name or what is in them, bars by
 * name (yours, near you, or any name typed, which opens as a bar with no known
 * menu), and a drink not on the map, which can still be rated. With a bar
 * open its name sits in the box, and the box searches its menu.
 *
 * The app bar renders a plain GET form there (`/map?q=`), which works with
 * script off; once the island is up, this takes its place, keeping anything
 * already typed.
 */
export function SearchBox({ e }: { e: Explore }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById(SEARCH_HOST_ID);
    if (!el) return;
    const typed = el.querySelector('input')?.value;
    if (typed && !e.query) e.setQuery(typed);
    el.replaceChildren();
    setHost(el);
    // Taken over once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return host ? createPortal(<Box e={e} />, host) : null;
}

function Box({ e }: { e: Explore }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const away = (ev: PointerEvent) => {
      if (root.current && !root.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const done = () => {
    setOpen(false);
    input.current?.blur();
  };
  const inMenu = !!e.venue;
  const menuHits = inMenu && e.searching ? e.ranked.filter((r) => e.drinkHits.some((d) => d.name === r.drink.name)) : [];
  const showResults = open && (e.searching || (!inMenu && (e.barHits.length > 0 || e.nearHits.length > 0)));

  return (
    <div ref={root} className="relative min-w-0 flex-1">
      <form
        role="search"
        onSubmit={(ev) => {
          ev.preventDefault();
          const first = root.current?.querySelector<HTMLButtonElement>('[data-result]');
          first?.click();
        }}
        className="flex min-h-11 items-center gap-1 border border-foreground bg-card pl-2 focus-within:ring-2 focus-within:ring-ring"
      >
        {e.venue && (
          <span className="flex min-w-0 max-w-48 shrink-0 items-center gap-1 bg-secondary py-1 pl-2 pr-1 text-meta font-bold text-secondary-foreground">
            <span className="truncate">{e.venue.name ?? compass.atMenu.homeTitle}</span>
            <button
              type="button"
              aria-label={explore.leave(e.venue.name ?? compass.atMenu.homeTitle)}
              onClick={() => {
                e.leaveBar();
                e.setQuery('');
              }}
              className="flex h-7 w-7 items-center justify-center font-condensed text-ui"
            >
              &times;
            </button>
          </span>
        )}
        <label className="flex min-w-0 flex-1">
          <span className="sr-only">{compass.searchLabel}</span>
          <input
            ref={input}
            type="search"
            name="q"
            value={e.query}
            onChange={(ev) => {
              e.setQuery(ev.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(ev) => {
              if (ev.key === 'Escape') done();
            }}
            placeholder={inMenu ? explore.searchThisMenu : compass.placeholder}
            autoComplete="off"
            className="search-plain min-h-10 w-full min-w-0 border-0 bg-transparent px-1 text-field text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        {e.query && (
          <button
            type="button"
            aria-label={explore.clear}
            onClick={() => {
              e.setQuery('');
              input.current?.focus();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        )}
      </form>

      {showResults && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-sheet overflow-y-auto border border-foreground bg-card shadow-mcm">
          {inMenu ? (
            menuHits.length > 0 ? (
              <Group title={compass.drinksTitle}>
                {menuHits.map((r) => (
                  <Result key={r.drink.name} title={e.name(r.drink.name)} note={e.reasonFor(r.drink)} onPick={() => { e.chooseDrink(r.drink.name); done(); }} />
                ))}
              </Group>
            ) : (
              <p className="px-3.5 py-3 text-meta text-muted-foreground">{explore.nothing}</p>
            )
          ) : (
            <>
              {e.drinkHits.length > 0 && (
                <Group title={compass.drinksTitle}>
                  {e.drinkHits.map((d) => (
                    <Result key={d.name} title={e.name(d.name)} note={e.reasonFor(d)} onPick={() => { e.chooseDrink(d.name); done(); }} />
                  ))}
                </Group>
              )}
              {(e.barHits.length > 0 || e.nearHits.length > 0 || e.offerBar) && (
                <Group title={e.searching ? compass.barsTitle : compass.yourBars}>
                  {e.barHits.map((b) => (
                    <Result key={b.name} title={b.name} note={compass.barPours(b.pours)} onPick={() => { e.openBar({ name: b.name }); done(); }} />
                  ))}
                  {e.nearHits.map((b) => (
                    <Result
                      key={b.id}
                      title={b.name}
                      note={`${compass.kinds[b.kind]} · ${formatDistance(b.distance)}`}
                      onPick={() => { e.openBar({ name: b.name, at: { lat: b.lat, lon: b.lon } }); done(); }}
                    />
                  ))}
                  {e.offerBar && (
                    <Result title={compass.pickAt(e.offerBar)} onPick={() => { e.openBar({ name: e.offerBar }); done(); }} caps />
                  )}
                </Group>
              )}
              {e.searching && e.drinkHits.length === 0 && (
                <div className="border-t border-border px-3.5 py-3">
                  <p className="text-meta text-muted-foreground">{compass.noDrinks}</p>
                  <button
                    type="button"
                    onClick={() => {
                      e.rate.open({ drink: e.query.trim() });
                      done();
                    }}
                    className="link-caps mt-1 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
                  >
                    {compass.rateUnlisted(e.query.trim())} &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label-caps px-3.5 pb-1 pt-3">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

function Result({ title, note, onPick, caps }: { title: string; note?: string; onPick: () => void; caps?: boolean }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        data-result
        onClick={onPick}
        className="flex min-h-11 w-full flex-col items-start px-3.5 py-2 text-left hover:bg-background focus-ring-inset"
      >
        <span className={cn(caps ? 'link-caps text-secondary' : 'font-serif text-prose font-bold text-foreground')}>{title}</span>
        {note && <span className="text-meta text-muted-foreground">{note}</span>}
      </button>
    </li>
  );
}
