import { useState, type SubmitEvent } from 'react';
import { matchDrink } from '@/lib/drink-match';
import type { AskedIntensity, BaseSpirit, CataNote, Deviation, Glassware } from '@/lib/atproto/vocab';
import { entryFromFields, type PourEntry } from '@/lib/pour-entry';
import type { PourDraft } from '@/lib/pour-draft';

/** Add it if absent, take it out if present. */
function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

/**
 * The pour form's fields and what a tap does to them, so `PourForm.tsx` only
 * draws. What the fields add up to, and what is missing, is
 * `entryFromFields` (`src/lib/pour-entry.ts`). The bar is the caller's
 * (`venue`), so the sheet can re-weight its quick picks by where you are.
 */
export function usePourForm({
  draft,
  initialDrink,
  isMember,
  venue,
  error,
  onSubmit,
}: {
  draft?: PourDraft;
  initialDrink: string;
  isMember: boolean;
  venue: string;
  error: string | null;
  onSubmit: (entry: PourEntry) => void;
}) {
  const [drinkName, setDrinkName] = useState(draft?.drink ?? initialDrink);
  const [isHomePour, setIsHomePour] = useState(draft?.atHome ?? false);
  // `null` until tapped: a rating is what the drinker said, never a default
  // (an untouched 7 would pull the coordinate in their name).
  const [hedonic, setHedonic] = useState<number | null>(null);
  const [deviations, setDeviations] = useState<Deviation[]>(draft?.deviations ?? []);
  const [cata, setCata] = useState<CataNote[]>(draft?.cata ?? []);
  const [note, setNote] = useState(draft?.note ?? '');
  const [crosspost, setCrosspost] = useState(false);
  const [baseSpirit, setBaseSpirit] = useState<BaseSpirit | ''>('');
  const [glassware, setGlassware] = useState<Glassware | ''>('');
  const [garnish, setGarnish] = useState('');
  const [intensities, setIntensities] = useState<Partial<Record<AskedIntensity, number>>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = entryFromFields(
      { drinkName, isHomePour, venue, hedonic, deviations, cata, note, crosspost, baseSpirit, glassware, garnish, intensities },
      isMember
    );
    if ('error' in result) return setLocalError(result.error);
    setLocalError(null);
    onSubmit(result.entry);
    setDeviations([]);
    setCata([]);
    setNote('');
    // Detail belongs to the drink just logged, not the next one.
    setBaseSpirit('');
    setGlassware('');
    setGarnish('');
    setIntensities({});
  };

  return {
    drinkName,
    setDrinkName,
    // A drink the map has no point for: logged all the same, and said so before it is.
    unlisted: !!drinkName.trim() && !matchDrink(drinkName),
    isHomePour,
    setIsHomePour,
    hedonic,
    setHedonic,
    deviations,
    toggleDeviation: (d: Deviation) => setDeviations((prev) => toggled(prev, d)),
    cata,
    toggleCata: (c: CataNote) => setCata((prev) => toggled(prev, c)),
    note,
    setNote,
    crosspost,
    setCrosspost,
    baseSpirit,
    setBaseSpirit,
    glassware,
    setGlassware,
    garnish,
    setGarnish,
    intensities,
    setIntensity: (quality: AskedIntensity, value: number) => setIntensities((prev) => ({ ...prev, [quality]: value })),
    submit,
    shownError: localError ?? error,
  };
}
