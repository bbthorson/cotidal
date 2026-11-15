import { useEffect, useState } from 'react';
import { waitingPick } from '@/lib/copy';
import { clearPick, loadPick, type DrinkPick } from '@/lib/device-store';
import { cleanDraft, type PourDraft } from '@/lib/pour-draft';

/**
 * A drink picked on Compass, waiting to be rated: on Compass and Log
 * alike, until it is rated (the rating sheet clears it) or set aside. It is on the
 * device, so it is read after mount.
 *
 * A strip ruled in ink, not a sheet: the one sheet on Compass is the top pick,
 * and a waiting pick sitting above it must not compete (docs/design-system.md).
 */
export function WaitingPick({
  displayName,
  version,
  onRate,
}: {
  displayName: (name: string) => string;
  /** Open the rating sheet on the pick, as a draft: where it was had, with no rating. */
  onRate: (draft: PourDraft) => void;
  /** Changes when the screen has just kept a pick, so the strip reads the device again. */
  version?: number;
}) {
  const [pick, setPick] = useState<DrinkPick | null>(null);
  useEffect(() => setPick(loadPick()), [version]);
  if (!pick) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-foreground py-2">
      <div className="mr-auto flex min-w-0 flex-col">
        <span className="label-caps">{waitingPick.waiting}</span>
        <span className="truncate font-serif text-prose font-bold text-foreground">
          {displayName(pick.drink)}
          {(pick.bar || pick.atHome) && (
            <span className="font-body text-meta font-normal text-muted-foreground">
              {' '}
              · {pick.atHome ? waitingPick.atHome : pick.bar}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-x-5">
        <button
          type="button"
          onClick={() => {
            const draft = cleanDraft({
              drink: pick.drink,
              atHome: pick.atHome,
              bar: pick.bar,
              lat: pick.at?.lat,
              lon: pick.at?.lon,
            });
            if (draft) onRate(draft);
          }}
          className="link-caps font-bold text-secondary hover:underline hover:underline-offset-4"
        >
          {waitingPick.rate} &rarr;
        </button>
        <button
          type="button"
          onClick={() => {
            clearPick();
            setPick(null);
          }}
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {waitingPick.dismiss}
        </button>
      </div>
    </div>
  );
}
