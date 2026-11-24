import { useState } from 'react';
import { account, settings } from '@/lib/copy';
import { AUTH_BASE_PATH, publicMapPath } from '@/lib/atproto/paths';
import { sharePalateToFeed } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const link = 'link-caps';

/** A member's settings page: connected assistants, and the account as one page. */
const SETTINGS_PATH = '/settings';
const MCP_PATH = '/mcp';

/**
 * The account, in one compact block under the ledger: who you are, your public
 * map, sharing, chat assistant setup (/mcp), settings, start over, and sign out.
 * A guest has no account to manage, so sees only start over.
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
              <a href={MCP_PATH} className={cn(link, 'text-secondary hover:underline hover:underline-offset-4')}>
                {account.assistants}
              </a>
              <a href={SETTINGS_PATH} className={cn(link, 'text-secondary hover:underline hover:underline-offset-4')}>
                {settings.title}
              </a>
            </>
          )}
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={cn(link, 'text-muted-foreground hover:text-foreground')}
            >
              {account.startOver}
            </button>
          )}
          {handle && (
            <form method="POST" action={`${AUTH_BASE_PATH}/logout`} className="inline-flex">
              <button type="submit" className={cn(link, 'text-muted-foreground hover:text-foreground')}>
                {account.signOutTitle}
              </button>
            </form>
          )}
        </div>
        {shareError && (
          <p role="alert" className="text-meta text-destructive">
            {shareError}
          </p>
        )}
        {confirming && <StartOver onConfirm={onStartOver} onCancel={() => setConfirming(false)} />}
      </div>
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
