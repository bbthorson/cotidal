import { useState } from 'react';
import { account } from '@/lib/copy';
import { AUTH_BASE_PATH, publicMapPath } from '@/lib/atproto/paths';
import { sharePalateToFeed } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const link = 'link-caps';

/**
 * The account, in one block under the ledger: who you are, your public map,
 * sharing, chat assistants, start over, and signing out. It used to be a page
 * of its own (`/account`), which now lands here. A guest has no account to
 * manage, so sees only start over.
 */
export function AccountSection({
  handle,
  topName,
  regionName,
  onStartOver,
}: {
  /** Null for a guest. */
  handle: string | null;
  topName: string;
  regionName: string;
  onStartOver: () => void;
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

  return (
    <section id="account" aria-labelledby="account-title" className="mt-8 scroll-mt-4">
      <h2 id="account-title" className="section-title">
        {account.title}
      </h2>
      <div className="mt-3">
        {handle && (
          <p className="text-meta text-muted-foreground">
            {account.signedInAs} <span className="font-bold text-foreground">@{handle}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5">
          {handle && (
            <>
              <a href={publicMapPath(handle)} className={cn(link, 'text-secondary hover:text-primary')}>
                {account.publicMap}
              </a>
              <button
                type="button"
                onClick={share}
                disabled={shareState !== 'idle'}
                className={cn(link, 'text-secondary hover:text-primary disabled:text-muted-foreground')}
              >
                {shareState === 'shared' ? account.shared : account.share}
              </button>
              <a href="/assistants" className={cn(link, 'text-secondary hover:text-primary')}>
                {account.assistants}
              </a>
            </>
          )}
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={cn(link, 'text-muted-foreground hover:text-primary')}
            >
              {account.startOver}
            </button>
          )}
        </div>
        {shareError && (
          <p role="alert" className="text-meta text-destructive">
            {shareError}
          </p>
        )}
        {confirming && <StartOver onConfirm={onStartOver} onCancel={() => setConfirming(false)} />}
      </div>

      {handle && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-serif text-plate font-bold">{account.signOutTitle}</h3>
          <p className="text-ui text-muted-foreground">{account.signOutBody}</p>
          {/* A form post that answers with a redirect, like the header's: no script needed. */}
          <form method="POST" action={`${AUTH_BASE_PATH}/logout`}>
            <button type="submit" className="btn btn-outline px-4">
              {account.signOutTitle}
            </button>
          </form>
        </div>
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
    <div role="group" aria-label={account.startOver} className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
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
