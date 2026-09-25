import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { drinkDatabase } from '@/lib/data';
import { DEVIATIONS, type SensoryProfile } from '@/lib/atproto/records';
import { pour } from '@/lib/copy';
import { cn } from '@/lib/utils';

export type Deviation = (typeof DEVIATIONS)[number];

/** What the form hands back. `hedonic` is the stored 9-point scale. */
export interface PourEntry {
  drinkName: string;
  hedonic: number;
  isHomePour: boolean;
  venue: string;
  deviations: Deviation[];
  note: string;
  crosspost: boolean;
  detail?: {
    baseSpirit: string;
    glassware: string;
    garnish: string;
    sensory?: SensoryProfile;
  };
}

/**
 * The server's 0–10 rating for a hedonic score. It maps back with
 * round(rating × 0.8 + 1), so the stored score is exactly the one tapped.
 */
export const hedonicToRating = (hedonic: number) => (hedonic - 1) * 1.25;

const BASE_SPIRITS = ['Bourbon', 'Rye', 'Scotch', 'Gin', 'Rum', 'Tequila', 'Mezcal', 'Vodka', 'Cognac / Brandy', 'Amaro / Aperitif', 'Non-alcoholic'];
const GLASSES = ['Coupe', 'Nick & Nora', 'Rocks', 'Highball', 'Martini', 'Tiki mug'];
const SENSORY_AXES = ['bitter', 'sweet', 'sour', 'spiritForward', 'citrus', 'herbal'] as const;

interface PourFormProps {
  /** Quick picks shown under the drink field, e.g. the top of your menu. */
  suggestions: string[];
  suggestionsLabel?: string;
  /** The printed name for a drink (the register's title), if tidier. */
  labelFor?: (name: string) => string;
  initialDrink?: string;
  /** Controlled, so the menu in /taste can re-weight by where you are. */
  venue: string;
  onVenueChange: (venue: string) => void;
  recentVenues?: string[];
  /** Signed in: offer cross-posting and the optional detail fields. */
  isMember: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (entry: PourEntry) => void;
  /** Rendered in place of the submit button, e.g. when logging needs an account. */
  submitSlot?: ReactNode;
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
  venue,
  onVenueChange,
  recentVenues = [],
  isMember,
  submitting,
  error,
  onSubmit,
  submitSlot,
}: PourFormProps) {
  const id = useId();
  const [drinkName, setDrinkName] = useState(initialDrink);
  const [isHomePour, setIsHomePour] = useState(false);
  const [hedonic, setHedonic] = useState(7);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [note, setNote] = useState('');
  const [crosspost, setCrosspost] = useState(false);
  const [baseSpirit, setBaseSpirit] = useState(BASE_SPIRITS[0]);
  const [glassware, setGlassware] = useState(GLASSES[0]);
  const [garnish, setGarnish] = useState('');
  const [sensoryOn, setSensoryOn] = useState(false);
  const [sensory, setSensory] = useState<SensoryProfile>({
    bitter: 2.5,
    sweet: 2.5,
    sour: 2.5,
    spiritForward: 3,
    citrus: 2.5,
    herbal: 2,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!drinkName.trim()) return setLocalError(pour.needDrink);
    if (!isHomePour && !venue.trim()) return setLocalError(pour.needBar);
    setLocalError(null);
    onSubmit({
      drinkName: drinkName.trim(),
      hedonic,
      isHomePour,
      venue: venue.trim(),
      deviations,
      note: note.trim(),
      crosspost: isMember && crosspost,
      detail: isMember
        ? { baseSpirit, glassware, garnish: garnish.trim(), sensory: sensoryOn ? sensory : undefined }
        : undefined,
    });
    setDeviations([]);
    setNote('');
  };

  const shownError = localError ?? error;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
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
                'min-h-11 font-condensed text-xs font-semibold uppercase tracking-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
          <span className="font-serif text-ui italic text-foreground" aria-live="polite">
            {pour.hedonic[hedonic - 1]}
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
                  'min-h-11 font-condensed text-ui font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
              <SelectField label={pour.spiritLabel} value={baseSpirit} options={BASE_SPIRITS} onChange={setBaseSpirit} />
              <SelectField label={pour.glassLabel} value={glassware} options={GLASSES} onChange={setGlassware} />
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
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-ui">
              <input
                type="checkbox"
                checked={sensoryOn}
                onChange={(e) => setSensoryOn(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-secondary"
              />
              {pour.sensoryLabel}
            </label>
            {sensoryOn && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {SENSORY_AXES.map((axis) => (
                  <label key={axis} className="flex flex-col gap-1">
                    <span className="dot-leader text-meta">
                      <span>{pour.sensory[axis]}</span>
                      <span aria-hidden="true" className="leader" />
                      <span className="font-condensed font-bold tabular-nums">{sensory[axis].toFixed(1)}</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={sensory[axis]}
                      onChange={(e) => setSensory((prev) => ({ ...prev, [axis]: parseFloat(e.target.value) }))}
                      className="w-full cursor-pointer accent-secondary"
                    />
                  </label>
                ))}
              </div>
            )}
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
        {submitSlot ?? (
          <button
            type="submit"
            disabled={submitting}
            className="min-h-13 w-full border border-foreground bg-secondary font-condensed text-sm font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground"
          >
            {submitting ? pour.submitting : pour.submit}
          </button>
        )}
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
        'min-h-9 border px-2.5 font-condensed text-xs uppercase tracking-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-secondary bg-secondary text-secondary-foreground'
          : 'border-border text-secondary hover:border-foreground'
      )}
    >
      {children}
    </button>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
