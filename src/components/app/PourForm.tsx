import { useId, useState, type SubmitEvent, type ReactNode } from 'react';
import { drinkDatabase } from '@/lib/data';
import {
  ASKED_INTENSITIES,
  BASE_SPIRITS,
  CATA,
  DEVIATIONS,
  GLASSWARE,
  GLMS_ANCHORS,
  type AskedIntensity,
  type BaseSpirit,
  type CataNote,
  type Glassware,
} from '@/lib/atproto/vocab';
import { pour } from '@/lib/copy';
import type { LogDrinkOptions } from '@/lib/api-client';
import type { PourDraft } from '@/lib/pour-draft';
import { cn } from '@/lib/utils';

export type Deviation = (typeof DEVIATIONS)[number];

/** What the form hands back. `hedonic` is the stored 9-point scale. */
export interface PourEntry {
  drinkName: string;
  hedonic: number;
  isHomePour: boolean;
  venue: string;
  deviations: Deviation[];
  cata?: CataNote[];
  note: string;
  crosspost: boolean;
  /** Only what the drinker set: an untouched field is absent, never a default. */
  detail?: {
    baseSpirit?: BaseSpirit;
    glassware?: Glassware;
    garnish?: string;
    /** gLMS, 0–100 (`perceivedIntensities` on the pour). */
    intensities?: Partial<Record<AskedIntensity, number>>;
  };
}

/**
 * The server's 0–10 rating for a hedonic score. It maps back with
 * round(rating × 0.8 + 1), so the stored score is exactly the one tapped.
 */
const hedonicToRating = (hedonic: number) => (hedonic - 1) * 1.25;

/** What the log route is sent for an entry. One mapping, for /taste and /log alike. */
export function toLogOptions(entry: PourEntry): LogDrinkOptions {
  return {
    drinkName: entry.drinkName,
    rating: hedonicToRating(entry.hedonic),
    isHomePour: entry.isHomePour,
    location: entry.isHomePour ? 'Home Pour' : entry.venue,
    venue: entry.isHomePour ? undefined : { name: entry.venue },
    deviations: entry.deviations,
    cata: entry.cata,
    note: entry.note || undefined,
    crosspostToFeed: entry.crosspost,
    baseSpirit: entry.detail?.baseSpirit,
    glassware: entry.detail?.glassware,
    garnish: entry.detail?.garnish,
    perceivedIntensities: entry.detail?.intensities,
  };
}

/** The gLMS word for a position on the scale: the highest anchor at or below it. */
export function glmsWord(value: number): string {
  const anchor = [...GLMS_ANCHORS].reverse().find((a) => value >= a.at);
  return anchor ? pour.glms[anchor.id] : pour.glmsNone;
}

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
  /** Controlled, so the menu in /taste can re-weight by where you are. */
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
 * field per idea, labels above, 16px values so iOS does not zoom.
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
  const [drinkName, setDrinkName] = useState(draft?.drink ?? initialDrink);
  const [isHomePour, setIsHomePour] = useState(draft?.atHome ?? false);
  // `null` until tapped, for a draft only: what was said in a chat is not a rating.
  const [hedonic, setHedonic] = useState<number | null>(draft ? null : 7);
  const [deviations, setDeviations] = useState<Deviation[]>(draft?.deviations ?? []);
  const [cata, setCata] = useState<CataNote[]>(draft?.cata ?? []);
  const [note, setNote] = useState(draft?.note ?? '');
  const [crosspost, setCrosspost] = useState(false);
  const [baseSpirit, setBaseSpirit] = useState<BaseSpirit | ''>('');
  const [glassware, setGlassware] = useState<Glassware | ''>('');
  const [garnish, setGarnish] = useState('');
  const [intensities, setIntensities] = useState<Partial<Record<AskedIntensity, number>>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  /** The detail fields the drinker set, or nothing. */
  const chosenDetail = (): PourEntry['detail'] => {
    const detail: NonNullable<PourEntry['detail']> = {
      ...(baseSpirit ? { baseSpirit } : {}),
      ...(glassware ? { glassware } : {}),
      ...(garnish.trim() ? { garnish: garnish.trim() } : {}),
      ...(Object.keys(intensities).length > 0 ? { intensities } : {}),
    };
    return Object.keys(detail).length > 0 ? detail : undefined;
  };

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!drinkName.trim()) return setLocalError(pour.needDrink);
    if (!isHomePour && !venue.trim()) return setLocalError(pour.needBar);
    if (hedonic === null) return setLocalError(pour.needRating);
    setLocalError(null);
    onSubmit({
      drinkName: drinkName.trim(),
      hedonic,
      isHomePour,
      venue: venue.trim(),
      deviations,
      cata: cata.length > 0 ? cata : undefined,
      note: note.trim(),
      crosspost: isMember && crosspost,
      detail: isMember ? chosenDetail() : undefined,
    });
    setDeviations([]);
    setCata([]);
    setNote('');
    // Detail belongs to the drink just logged, not the next one.
    setBaseSpirit('');
    setGlassware('');
    setGarnish('');
    setIntensities({});
  };

  const shownError = localError ?? error;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
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
          value={drinkName}
          onChange={(e) => setDrinkName(e.target.value)}
          placeholder={pour.drinkPlaceholder}
          autoComplete="off"
          className={inputClass}
        />
        <datalist id={`${id}-catalog`}>
          {drinkDatabase.map((d) => (
            <option key={d.name} value={d.name} />
          ))}
        </datalist>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">
              {suggestionsLabel}
            </span>
            {suggestions.slice(0, 4).map((name) => (
              <Tag key={name} active={drinkName === name} onClick={() => setDrinkName(name)}>
                {labelFor(name)}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* Where */}
      <div className="flex flex-col gap-2">
        <FieldLabel as="span">{pour.whereLabel}</FieldLabel>
        <div role="group" aria-label={pour.whereLabel} className="grid grid-cols-2 border border-foreground">
          {[false, true].map((home) => (
            <button
              key={String(home)}
              type="button"
              aria-pressed={isHomePour === home}
              onClick={() => setIsHomePour(home)}
              className={cn(
                'min-h-11 font-condensed text-xs font-semibold uppercase tracking-label transition-colors focus-ring-inset',
                home && 'border-l border-foreground',
                isHomePour === home ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground hover:bg-muted'
              )}
            >
              {home ? pour.atHome : pour.atBar}
            </button>
          ))}
        </div>
        {!isHomePour && (
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
                <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">
                  {pour.recentLabel}
                </span>
                {recentVenues.slice(0, 5).map((v) => (
                  <Tag key={v} active={venue === v} onClick={() => onVenueChange(venue === v ? '' : v)}>
                    {v}
                  </Tag>
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
            className={cn('font-serif text-ui italic', hedonic === null ? 'text-primary' : 'text-foreground')}
            aria-live="polite"
          >
            {hedonic === null ? pour.tapRating : pour.hedonic[hedonic - 1]}
          </span>
        </div>
        <div role="radiogroup" aria-label={pour.ratingLabel} className="grid grid-cols-9 border border-foreground">
          {pour.hedonic.map((label, i) => {
            const n = i + 1;
            const active = n === hedonic;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${n}: ${label}`}
                onClick={() => setHedonic(n)}
                className={cn(
                  'min-h-11 font-condensed text-ui font-bold tabular-nums transition-colors focus-ring-inset',
                  i > 0 && 'border-l border-foreground',
                  active ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
                )}
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
            const active = deviations.includes(dev);
            return (
              <Tag
                key={dev}
                active={active}
                onClick={() => setDeviations((prev) => (active ? prev.filter((d) => d !== dev) : [...prev, dev]))}
              >
                {pour.deviations[dev]}
              </Tag>
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
            const active = cata.includes(item);
            return (
              <Tag
                key={item}
                active={active}
                onClick={() => setCata((prev) => (active ? prev.filter((c) => c !== item) : [...prev, item]))}
              >
                {pour.cata[item]}
              </Tag>
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
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
            <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="flex flex-col gap-5 pb-5 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label={pour.spiritLabel}
                value={baseSpirit}
                options={BASE_SPIRITS.map((v) => ({ value: v, label: pour.spirits[v] }))}
                onChange={(v) => setBaseSpirit(v as BaseSpirit | '')}
              />
              <SelectField
                label={pour.glassLabel}
                value={glassware}
                options={GLASSWARE.map((v) => ({ value: v, label: pour.glasses[v] }))}
                onChange={(v) => setGlassware(v as Glassware | '')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor={`${id}-garnish`}>{pour.garnishLabel}</FieldLabel>
              <input
                id={`${id}-garnish`}
                type="text"
                value={garnish}
                onChange={(e) => setGarnish(e.target.value)}
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
                  const value = intensities[quality];
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
                        onChange={(e) =>
                          setIntensities((prev) => ({ ...prev, [quality]: Number(e.target.value) }))
                        }
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
            checked={crosspost}
            onChange={(e) => setCrosspost(e.target.checked)}
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
        {shownError && (
          <p role="alert" className="text-meta text-destructive">
            {shownError}
          </p>
        )}
      </div>
    </form>
  );
}

const inputClass =
  'min-h-12 w-full rounded-sm border border-border bg-card px-3.5 font-body text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

function FieldLabel({
  children,
  htmlFor,
  as = 'label',
}: {
  children: ReactNode;
  htmlFor?: string;
  as?: 'label' | 'span';
}) {
  const className = 'font-condensed text-xs uppercase tracking-label text-muted-foreground';
  return as === 'label' ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** Axis-style tag: outline at rest, forest when on. */
function Tag({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 border px-2.5 font-condensed text-xs uppercase tracking-label transition-colors',
        active
          ? 'border-secondary bg-secondary text-secondary-foreground'
          : 'border-border text-secondary hover:border-foreground'
      )}
    >
      {children}
    </button>
  );
}

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
      <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">{label}</span>
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
