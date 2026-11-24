import { useState } from 'react';
import { account, settings } from '@/lib/copy';
import { publicMapPath } from '@/lib/atproto/paths';
import { sharePalateToFeed } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const link = 'link-caps';

/** Full account management (assistants, start over, sign out) lives on `/settings`. */
const SETTINGS_PATH = '/settings';

/**
 * Quiet foot strip at the bottom of `/log`.
 *
 * - Member: who you are signed in as, plus the three log-adjacent actions
 *   (public map, share to feed, Settings ->). Assistants, start over, and sign
 *   out live on `/settings` so Log stays about your palate and pours.
 * - Guest: only the two-step Start over control (guests have no `/settings`).
 */
export function AccountSection({
  handle,
  topName,
  regionName,
  onStartOver,
  flush = false,
}: {
  /** Null for a guest. */
  handle: string | null;
  topName: string;
  regionName: string;
  onStartOver: () => void;
  /** Skip the top rule when an element directly above already draws one (e.g. `GuestPrompt`). */
  flush?: boolean;
}) {
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const share = async () => {
    setShareState('sharing');
    setShareError(null);
    const response = await sharePalateToFeed(topName, regionName);
    if (response.success) {
      setShareState('shared');
    } else {
      setShareState('idle');
      setShareError(response.error || account.shareFailed);
    }
  };

  if (handle) {
    return (
      <section id="account" aria-label={account.title} className="mt-10 scroll-mt-4 border-t border-foreground pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-meta text-muted-foreground">
            {account.signedInAs} <span className="font-bold text-foreground">@{handle}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5">
            <a href={publicMapPath(handle)} className={cn(link, 'text-secondary hover:underline hover:underline-offset-4')}>
              {account.publicMap}
            </a>
            <button
              type="button"
              onClick={share}
              disabled={shareState !== 'idle'}
              className={cn(link, 'text-secondary hover:text-foreground disabled:text-muted-foreground')}
            >
              {shareState === 'shared' ? account.shared : account.share}
            </button>
            <a href={SETTINGS_PATH} className={cn(link, 'text-foreground hover:underline hover:underline-offset-4')}>
              {settings.title} &rarr;
            </a>
          </div>
        </div>
        {shareError && (
          <p role="alert" className="mt-2 text-meta text-destructive">
            {shareError}
          </p>
        )}
      </section>
    );
  }

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
          className={cn(link, 'text-muted-foreground hover:text-foreground')}
        >
          {account.startOver}
        </button>
      ) : (
        <StartOver onConfirm={onStartOver} onCancel={() => setConfirming(false)} />
      )}
    </section>
  );
}

/**
 * Start over, in two steps: the link above says what it is, this does it.
 * A coordinate built from a quiz and a ledger of pours is not something to
 * lose to a stray tap.
 */
function StartOver({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="group" aria-label={account.startOver} className="flex flex-col gap-3 pt-1">
      <p className="text-ui text-muted-foreground">{account.startOverBody}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={onConfirm} className="btn btn-primary px-4">
          {account.startOverCta}
        </button>
        <button type="button" onClick={onCancel} className={cn(link, 'text-muted-foreground hover:text-foreground')}>
          {account.startOverCancel}
        </button>
      </div>
    </div>
  );
}
