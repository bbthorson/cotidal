import { useEffect, useState } from 'react';
import { pour, waitingPick } from '@/lib/copy';
import { clearPick, loadPick, type DrinkPick } from '@/lib/device-store';
import { draftFromPick, entryFromPick, pickAge, REORDER_HEDONIC } from '@/lib/pours/pick-age';
import type { PourDraft } from '@/lib/pours/pour-draft';
import type { PourEntry } from '@/lib/pours/pour-entry';
import type { SubmitPourOptions } from '@/hooks/useRatePour';
import { Notice } from './ui';

/**
 * A drink picked on the map, waiting to be rated: ruled in ink at the head of
 * the card, with the nine hedonic cells inline so one tap logs the pour and
 * shows `Moved` without scrolling the map away on a phone.
 *
 * "What was off" and "More detail" open the full `RatePanel` (which scrolls the
 * card up). "Another" logs a reorder and keeps the pick waiting for the next
 * round. "Didn't have it" clears it with no rating. After ~12 hours it asks in
 * the past tense and offers "Set it aside".
 */
export function WaitingPick({
  displayName,
  version,
  submitting,
  error,
  onQuickRate,
  onOpenDetail,
}: {
  displayName: (name: string) => string;
  /** Changes when the screen has just kept or rated a pick, so the strip reads the device again. */
  version?: number;
  submitting?: boolean;
  error?: string | null;
  /** Log a one-tap rating or "Another" reorder directly through `useRatePour`. */
  onQuickRate: (entry: PourEntry, opts: SubmitPourOptions) => void;
  /** Open the full rating form on the pick's draft ("What was off" / "More detail"). */
  onOpenDetail: (draft: PourDraft, openDetail?: boolean) => void;
}) {
  const [pick, setPick] = useState<DrinkPick | null>(null);
  useEffect(() => setPick(loadPick()), [version]);
  if (!pick) return null;

  const age = pickAge(pick.pickedAt);
  const stale = age?.stale ?? false;
  const place = pick.atHome ? waitingPick.atHome : pick.bar;
  const meta = [place, age?.label].filter(Boolean).join(' · ');

  const openFull = (openDetail?: boolean) => {
    const draft = draftFromPick(pick);
    if (draft) onOpenDetail(draft, openDetail);
  };

  const tapRating = (hedonic: number, keepPick = false) => {
    const draft = draftFromPick(pick) ?? undefined;
    const entry = entryFromPick(pick, hedonic, keepPick ? true : undefined);
    onQuickRate(entry, { draft, keepPick });
  };

  return (
    <section
      aria-label={stale ? waitingPick.pastWaiting : waitingPick.waiting}
      data-testid="waiting-pick"
      className="mb-4 mt-3 border-y border-foreground py-3"
    >
      <div className="flex min-w-0 flex-col">
        <span className="label-caps">{stale ? waitingPick.pastWaiting : waitingPick.waiting}</span>
        <span className="truncate font-serif text-prose font-bold text-foreground">
          {displayName(pick.drink)}
          {meta && <span className="font-body text-meta font-normal text-muted-foreground"> · {meta}</span>}
        </span>
      </div>

      <div role="radiogroup" aria-label={pour.ratingLabel} className="segmented mt-2.5 grid grid-cols-9">
        {pour.hedonic.map((label, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={false}
              aria-label={`${n}: ${label}`}
              disabled={submitting}
              onClick={() => tapRating(n)}
              className="segment text-ui font-bold tabular-nums"
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-meta text-muted-foreground">
        <span>{pour.hedonic[0]}</span>
        <span>{pour.hedonic[8]}</span>
      </div>

      {error && (
        <Notice tone="alert" className="mt-2">
          {error}
        </Notice>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {!stale && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => tapRating(REORDER_HEDONIC, true)}
            className="link-caps font-bold text-secondary hover:underline hover:underline-offset-4"
          >
            {waitingPick.another}
          </button>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={() => openFull(false)}
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {waitingPick.whatWasOff}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => openFull(true)}
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {pour.moreDetail}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            clearPick();
            setPick(null);
          }}
          className="link-caps ml-auto text-muted-foreground hover:text-foreground"
        >
          {stale ? waitingPick.dismiss : waitingPick.didntHave}
        </button>
      </div>
    </section>
  );
}
