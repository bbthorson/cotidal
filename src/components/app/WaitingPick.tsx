import { useEffect, useState } from 'react';
import { harbour } from '@/lib/copy';
import { clearPick, loadPick, type DrinkPick } from '@/lib/device-store';
import { draftPath } from '@/lib/pour-draft';

/**
 * A drink picked in the harbour, waiting to be rated: on Radio, Compass and Log
 * alike, until it is rated (`/log` clears it) or set aside. It is on the
 * device, so it is read after mount.
 *
 * A strip ruled in ink, not a sheet: the one sheet on Compass is the top pick,
 * and a waiting pick sitting above it must not compete (docs/design-system.md).
 */
export function WaitingPick({ displayName }: { displayName: (name: string) => string }) {
  const [pick, setPick] = useState<DrinkPick | null>(null);
  useEffect(() => setPick(loadPick()), []);
  if (!pick) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-foreground py-2">
      <div className="mr-auto flex min-w-0 flex-col">
        <span className="label-caps">{harbour.waiting}</span>
        <span className="truncate font-serif text-prose font-bold text-foreground">
          {displayName(pick.drink)}
          {(pick.bar || pick.atHome) && (
            <span className="font-body text-meta font-normal text-muted-foreground">
              {' '}
              · {pick.atHome ? harbour.atHome : pick.bar}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-x-5">
        <a
          href={draftPath({ drink: pick.drink, atHome: pick.atHome, bar: pick.bar, at: pick.at })}
          className="link-caps font-bold text-secondary hover:underline hover:underline-offset-4"
        >
          {harbour.rate} &rarr;
        </a>
        <button
          type="button"
          onClick={() => {
            clearPick();
            setPick(null);
          }}
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {harbour.dismiss}
        </button>
      </div>
    </div>
  );
}
