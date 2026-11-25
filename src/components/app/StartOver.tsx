import { useState } from 'react';
import { account } from '@/lib/copy';
import { cn } from '@/lib/utils';

/**
 * Start over, at the foot of Your map for a guest, who has no Settings (a member
 * starts over there). Two steps: the link says what it is, the second step
 * does it. A coordinate built from a quiz and a ledger of pours is not
 * something to lose to a stray tap.
 */
export function StartOver({
  onConfirm,
  flush = false,
}: {
  onConfirm: () => void;
  /** Skip the top rule when an element directly above already draws one (e.g. `GuestPrompt`). */
  flush?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      id="account"
      aria-label={account.title}
      className={cn('scroll-mt-4', flush ? 'mt-3' : 'mt-10 border-t border-border pt-3')}
    >
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="link-caps text-muted-foreground hover:text-foreground"
        >
          {account.startOver}
        </button>
      ) : (
        <div role="group" aria-label={account.startOver} className="flex flex-col gap-3 pt-1">
          <p className="text-ui text-muted-foreground">{account.startOverBody}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={onConfirm} className="btn btn-primary px-4">
              {account.startOverCta}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="link-caps text-muted-foreground hover:text-foreground"
            >
              {account.startOverCancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
