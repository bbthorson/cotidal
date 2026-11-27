import { useState, type FormEvent } from 'react';
import { overlays as copy } from '@/lib/copy';
import { DRINK_TYPES } from '@/lib/palate/overlays';
import type { OverlaysState } from '@/hooks/useOverlays';
import { cn } from '@/lib/utils';
import { Notice } from './ui';

/**
 * Quiet, composable overlay strip (`Lens × Scope`) under `SearchBox` on `/map`.
 * At rest: compact chips for `With someone`, `Uncharted`, and drink types.
 * Active overlays appear as dismissible chips; tapping `With someone` expands
 * a single inline handle input (supporting 1-on-1 `with` or 2–5 person `table`).
 */
export function OverlayBar({ overlays }: { overlays: OverlaysState }) {
  const [adding, setAdding] = useState(false);
  const [handle, setHandle] = useState('');

  const submit = async (ev: FormEvent) => {
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

  return (
    <div aria-label={copy.barLabel} className="mt-2.5 flex flex-col gap-2" data-testid="overlay-bar">
      {/* Primary row: Lens triggers + active companion chips */}
      <div className="flex flex-wrap items-center gap-1.5">
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
            overlays.clearError();
          }}
          aria-expanded={adding}
          className={cn('chip', adding && 'border-foreground text-foreground')}
          data-testid="overlay-with-btn"
        >
          {overlays.companions.length > 0 ? copy.addAnother : copy.withButton}
        </button>

        <button
          type="button"
          onClick={overlays.toggleExplore}
          aria-pressed={overlays.lens === 'explore'}
          className={cn('chip', overlays.lens === 'explore' && 'border-secondary bg-secondary text-card')}
          data-testid="overlay-explore-btn"
        >
          {copy.exploreButton}
        </button>

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
