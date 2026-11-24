import { useId, type ReactNode } from 'react';
import { drinkDatabase } from '@/lib/data';
import {
  ASKED_INTENSITIES,
  BASE_SPIRITS,
  CATA,
  DEVIATIONS,
  GLASSWARE,
  GLMS_ANCHORS,
  type BaseSpirit,
  type Glassware,
} from '@/lib/atproto/vocab';
import { pour } from '@/lib/copy';
import { glmsWord, type PourEntry } from '@/lib/pour-entry';
import type { PourDraft } from '@/lib/pour-draft';
import { usePourForm } from '@/hooks/usePourForm';
import { cn } from '@/lib/utils';
import { Chip } from './ui';

interface PourFormProps {
  /** Quick picks shown under the drink field, e.g. the top of your menu. */
  suggestions: string[];
  suggestionsLabel?: string;
  /** The printed name for a drink (the register's title), if tidier. */
  labelFor?: (name: string) => string;
  initialDrink?: string;
  /**
   * A pour drafted elsewhere (a chat assistant, `/log?draft=1`), to check and
   * confirm. It fills what it carries and leaves the rating unset: the
   * drinker taps it, and the form will not log until they do.
   */
  draft?: PourDraft;
  /** Controlled, so the page can re-weight its quick picks by where you are. */
  venue: string;
  onVenueChange: (venue: string) => void;
  recentVenues?: string[];
  /** Signed in: offer cross-posting and the optional detail fields. */
  isMember: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (entry: PourEntry) => void;
}

/**
 * The one pour form (design system: plates, segmented controls, tags). One
 * field per idea, labels above, 16px values so iOS does not zoom. It draws;
 * the fields and what a tap does to them are `usePourForm`.
 */
export function PourForm({
  suggestions,
  suggestionsLabel = pour.suggestionsLabel,
  labelFor = (name) => name,
  initialDrink = '',
  draft,
  venue,
  onVenueChange,
  recentVenues = [],
  isMember,
  submitting,
  error,
  onSubmit,
}: PourFormProps) {
  const id = useId();
  const f = usePourForm({ draft, initialDrink, isMember, venue, error, onSubmit });

  return (
    <form onSubmit={f.submit} className="flex flex-col gap-6">
      {draft && (
        <p className="border-l-2 border-secondary pl-3 text-ui text-foreground" data-testid="pour-draft-note">
          {pour.draftNote}
        </p>
      )}

      {/* The drink */}
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${id}-drink`}>{pour.drinkLabel}</FieldLabel>
        <input
          id={`${id}-drink`}
          type="text"
          list={`${id}-catalog`}
          value={f.drinkName}
          onChange={(e) => f.setDrinkName(e.target.value)}
          placeholder={pour.drinkPlaceholder}
          autoComplete="off"
          className={inputClass}
        />
        {f.unlisted && <p className="text-meta text-muted-foreground">{pour.unlisted(f.drinkName.trim())}</p>}
        <datalist id={`${id}-catalog`}>
          {drinkDatabase.map((d) => (
            <option key={d.name} value={d.name} />
          ))}
        </datalist>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-condensed text-label uppercase tracking-label text-muted-foreground">
              {suggestionsLabel}
            </span>
            {suggestions.slice(0, 4).map((name) => (
              <Chip key={name} active={f.drinkName === name} onClick={() => f.setDrinkName(name)}>
                {labelFor(name)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Where */}
      <div className="flex flex-col gap-2">
        <FieldLabel as="span">{pour.whereLabel}</FieldLabel>
        <div role="group" aria-label={pour.whereLabel} className="segmented grid grid-cols-2">
          {[false, true].map((home) => (
            <button
              key={String(home)}
              type="button"
              aria-pressed={f.isHomePour === home}
              onClick={() => f.setIsHomePour(home)}
              className="segment"
            >
              {home ? pour.atHome : pour.atBar}
            </button>
          ))}
        </div>
        {!f.isHomePour && (
          <>
            <label htmlFor={`${id}-bar`} className="sr-only">
              {pour.barLabel}
            </label>
            <input
              id={`${id}-bar`}
              type="text"
              value={venue}
              onChange={(e) => onVenueChange(e.target.value)}
              placeholder={pour.barPlaceholder}
              className={inputClass}
            />
            {recentVenues.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-condensed text-label uppercase tracking-label text-muted-foreground">
                  {pour.recentLabel}
                </span>
                {recentVenues.slice(0, 5).map((v) => (
                  <Chip key={v} active={venue === v} onClick={() => onVenueChange(venue === v ? '' : v)}>
                    {v}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* How it landed: the 9-point hedonic scale, one cell per point */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <FieldLabel as="span">{pour.ratingLabel}</FieldLabel>
          <span
            className={cn('font-serif text-ui italic', f.hedonic === null ? 'text-muted-foreground' : 'text-foreground')}
            aria-live="polite"
          >
            {f.hedonic === null ? pour.tapRating : pour.hedonic[f.hedonic - 1]}
          </span>
        </div>
        <div role="radiogroup" aria-label={pour.ratingLabel} className="segmented grid grid-cols-9">
          {pour.hedonic.map((label, i) => {
            const n = i + 1;
            const active = n === f.hedonic;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${n}: ${label}`}
                onClick={() => f.setHedonic(n)}
                className="segment text-ui font-bold tabular-nums"
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-meta text-muted-foreground">
          <span>{pour.hedonic[0]}</span>
          <span>{pour.hedonic[8]}</span>
        </div>
      </div>

      {/* What was off: each one moves the coordinate */}
      <div className="flex flex-col gap-2">
        <FieldLabel as="span">
          {pour.deviationsLabel} <span className="normal-case tracking-normal">({pour.optional})</span>
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DEVIATIONS.map((dev) => {
            const active = f.deviations.includes(dev);
            return (
              <Chip
                key={dev}
                active={active}
                onClick={() => f.toggleDeviation(dev)}
              >
                {pour.deviations[dev]}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Check-all-that-apply notes: what was in the glass, not whether you liked it */}
      <div className="flex flex-col gap-2">
        <FieldLabel as="span">
          {pour.cataLabel} <span className="normal-case tracking-normal">({pour.optional})</span>
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CATA.map((item) => {
            const active = f.cata.includes(item);
            return (
              <Chip
                key={item}
                active={active}
                onClick={() => f.toggleCata(item)}
              >
                {pour.cata[item]}
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${id}-note`}>
          {pour.noteLabel} <span className="normal-case tracking-normal">({pour.optional})</span>
        </FieldLabel>
        <textarea
          id={`${id}-note`}
          value={f.note}
          onChange={(e) => f.setNote(e.target.value)}
          placeholder={pour.notePlaceholder}
          rows={2}
          maxLength={1000}
          className={cn(inputClass, 'resize-none py-3')}
        />
      </div>

      {isMember && (
        <details className="group border-y border-border">
          <summary className="summary-plain flex min-h-11 cursor-pointer items-center justify-between font-condensed text-meta font-semibold uppercase tracking-label text-foreground">
            {pour.moreDetail}
            <span aria-hidden="true" className="text-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="flex flex-col gap-5 pb-5 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label={pour.spiritLabel}
                value={f.baseSpirit}
                options={BASE_SPIRITS.map((v) => ({ value: v, label: pour.spirits[v] }))}
                onChange={(v) => f.setBaseSpirit(v as BaseSpirit | '')}
              />
              <SelectField
                label={pour.glassLabel}
                value={f.glassware}
                options={GLASSWARE.map((v) => ({ value: v, label: pour.glasses[v] }))}
                onChange={(v) => f.setGlassware(v as Glassware | '')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor={`${id}-garnish`}>{pour.garnishLabel}</FieldLabel>
              <input
                id={`${id}-garnish`}
                type="text"
                value={f.garnish}
                onChange={(e) => f.setGarnish(e.target.value)}
                placeholder={pour.garnishPlaceholder}
                className={inputClass}
              />
            </div>
            {/* gLMS: position on a line with labelled anchors. Untouched means not rated, not zero. */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <FieldLabel as="span">{pour.intensityLabel}</FieldLabel>
                <span className="text-meta text-muted-foreground">{pour.intensityHint}</span>
              </div>
              <datalist id={`${id}-glms`}>
                {GLMS_ANCHORS.map((a) => (
                  <option key={a.id} value={a.at} label={pour.glms[a.id]} />
                ))}
              </datalist>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {ASKED_INTENSITIES.map((quality) => {
                  const value = f.intensities[quality];
                  const word = value === undefined ? pour.notRated : glmsWord(value);
                  return (
                    <label key={quality} className="flex flex-col gap-1">
                      <span className="dot-leader text-meta">
                        <span>{pour.intensities[quality]}</span>
                        <span aria-hidden="true" className="leader" />
                        <span className={cn('font-condensed font-bold', value === undefined && 'text-muted-foreground')}>
                          {word}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        list={`${id}-glms`}
                        value={value ?? 0}
                        aria-valuetext={word}
                        onChange={(e) => f.setIntensity(quality, Number(e.target.value))}
                        className={cn('w-full cursor-pointer accent-secondary', value === undefined && 'opacity-50')}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </details>
      )}

      {isMember && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-ui">
          <input
            type="checkbox"
            checked={f.crosspost}
            onChange={(e) => f.setCrosspost(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-secondary"
          />
          {pour.crosspost}
        </label>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary btn-lg w-full disabled:cursor-wait"
        >
          {submitting ? pour.submitting : pour.submit}
        </button>
        {f.shownError && (
          <p role="alert" className="text-meta text-destructive">
            {f.shownError}
          </p>
        )}
      </div>
    </form>
  );
}

const inputClass = 'field';

function FieldLabel({
  children,
  htmlFor,
  as = 'label',
}: {
  children: ReactNode;
  htmlFor?: string;
  as?: 'label' | 'span';
}) {
  const className = 'font-condensed text-label uppercase tracking-label text-muted-foreground';
  return as === 'label' ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** Axis-style tag: outline at rest, forest when on. */
/** A select that starts on nothing: the empty choice records nothing. */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-condensed text-label uppercase tracking-label text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{pour.notSet}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
