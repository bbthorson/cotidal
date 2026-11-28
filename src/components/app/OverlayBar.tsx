import { useState, type SubmitEvent } from 'react';
import { compass, explore, overlays as copy } from '@/lib/copy';
import { DRINK_TYPES } from '@/lib/palate/overlays';
import type { Explore } from '@/hooks/useExplore';
import type { OverlaysState } from '@/hooks/useOverlays';
import { cn } from '@/lib/utils';
import { DrinkRow } from './DrinkRow';
import { NearList } from './Near';
import { Notice, SectionTitle } from './ui';

/**
 * One composable chip row (`Where × For whom × Lenses`) under `SearchBox` on `/`:
 * - **Where:** open bar chip (`Attaboy ×`) or `At a bar` picker listing Your bars,
 *   Bars near you, and Have a menu?
 * - **For whom:** active companion chips + `With someone` / `Add to table`
 * - **Lenses:** `Uncharted` and drink types
 *
 * Chips cross: a bar with a companion ranks that bar's menu for both (`MenuView`).
 */
export function OverlayBar({
  overlays,
  e,
}: {
  overlays: OverlaysState;
  e: Pick<Explore, 'venue' | 'barName' | 'barHits' | 'nearby' | 'openBar' | 'leaveBar' | 'setQuery'>;
}) {
  const [pickingBar, setPickingBar] = useState(false);
  const [adding, setAdding] = useState(false);
  const [handle, setHandle] = useState('');

  const submit = async (ev: SubmitEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const raw = handle.trim();
    if (!raw) return;
    const ok = await overlays.addCompanion(raw);
    if (ok) {
      setHandle('');
      setAdding(false);
    }
  };

  const quickAdd = async (sample: string) => {
    const ok = await overlays.addCompanion(sample);
    if (ok) setAdding(false);
  };

  const activeBarLabel = e.barName ?? compass.atMenu.homeTitle;

  return (
    <div aria-label={copy.barLabel} className="mt-2.5 flex flex-col gap-2" data-testid="overlay-bar">
      {/* One chip row: Where + For whom + Lenses */}
      <div className="flex flex-wrap items-center gap-1.5">
        {e.venue ? (
          <button
            type="button"
            onClick={() => {
              e.leaveBar();
              e.setQuery('');
              setPickingBar(false);
            }}
            aria-label={explore.leave(activeBarLabel)}
            className="chip border-secondary bg-secondary text-secondary-foreground"
            data-testid="where-chip-active"
          >
            {activeBarLabel} &times;
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPickingBar((v) => !v);
              setAdding(false);
            }}
            aria-expanded={pickingBar}
            className={cn('chip', pickingBar && 'border-foreground text-foreground')}
            data-testid="overlay-where-btn"
          >
            {copy.whereButton}
          </button>
        )}

        {overlays.companions.map((c) => (
          <button
            key={c.did}
            type="button"
            onClick={() => overlays.removeCompanion(c.did)}
            aria-label={copy.remove(`@${c.handle}`)}
            className="chip border-primary bg-primary text-card"
            data-testid={`companion-chip-${c.handle}`}
          >
            {overlays.companions.length === 1 ? copy.withChip(c.handle) : `@${c.handle}`} &times;
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setPickingBar(false);
            overlays.clearError();
          }}
          aria-expanded={adding}
          className={cn('chip', adding && 'border-foreground text-foreground')}
          data-testid="overlay-with-btn"
        >
          {overlays.companions.length > 0 ? copy.addAnother : copy.withButton}
        </button>

        {!e.venue && (
          <button
            type="button"
            onClick={overlays.toggleExplore}
            aria-pressed={overlays.lens === 'explore'}
            className={cn('chip', overlays.lens === 'explore' && 'border-secondary bg-secondary text-card')}
            data-testid="overlay-explore-btn"
          >
            {copy.exploreButton}
          </button>
        )}

        {DRINK_TYPES.map((type) => {
          const active = overlays.drinkType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => overlays.setDrinkType(type)}
              aria-pressed={active}
              className={cn('chip', active && 'border-foreground bg-foreground text-card')}
              data-testid={`overlay-type-${type.toLowerCase()}`}
            >
              {copy.types[type]}
            </button>
          );
        })}
      </div>

      {/* Inline bar picker: Your bars first, then Bars near you, then Have a menu? */}
      {pickingBar && !e.venue && (
        <div className="border-y border-border py-3" data-testid="where-picker">
          {e.barHits.length > 0 && (
            <section className="mb-4">
              <SectionTitle>{compass.yourBars}</SectionTitle>
              <ol>
                {e.barHits.map((b) => (
                  <DrinkRow
                    key={b.name}
                    title={b.name}
                    figure={compass.barPours(b.pours)}
                    onSelect={() => {
                      e.openBar({ name: b.name });
                      setPickingBar(false);
                    }}
                  />
                ))}
              </ol>
            </section>
          )}

          <NearList
            nearby={e.nearby}
            onOpen={(b) => {
              e.openBar({ name: b.name, at: { lat: b.lat, lon: b.lon }, osmId: b.id });
              setPickingBar(false);
            }}
          />

          <button
            type="button"
            onClick={() => {
              e.openBar({ name: null });
              setPickingBar(false);
            }}
            className="link-caps mt-3 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
          >
            {compass.haveMenu} &rarr;
          </button>
        </div>
      )}

      {/* Inline handle form when adding a friend / table member */}
      {adding && (
        <div className="border-y border-border py-2.5">
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                if (overlays.error) overlays.clearError();
              }}
              placeholder={copy.handlePlaceholder}
              aria-label={copy.handleLabel}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field min-h-10 flex-1"
              data-testid="overlay-handle-input"
            />
            <button type="submit" disabled={overlays.loading} className="btn btn-outline shrink-0 px-3">
              {overlays.loading ? copy.adding : copy.add}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                overlays.clearError();
              }}
              className="link-caps shrink-0 px-1 text-muted-foreground hover:text-foreground"
            >
              {copy.cancel}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
            <span>{copy.trySample}</span>
            <button type="button" onClick={() => void quickAdd(copy.sampleSurf)} className="link-inline">
              {copy.sampleSurf}
            </button>
            <button type="button" onClick={() => void quickAdd(copy.sampleDeep)} className="link-inline">
              {copy.sampleDeep}
            </button>
          </div>
          {overlays.error && (
            <Notice tone="alert" className="mt-2">
              {overlays.error}
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}
