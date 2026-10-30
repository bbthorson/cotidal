import { useState } from 'react';
import { account, logPage, menu, nav, publicMap } from '@/lib/copy';
import { AUTH_BASE_PATH, publicMapPath } from '@/lib/atproto/paths';
import { accountHref } from '@/lib/site-nav';
import { sharePalateToFeed } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * The account, in one block rather than three stacked ones: who you are (a
 * member), your public map, sharing, chat assistants, the account, and
 * start over. On Log; Compass keeps only start over. They were separate bands, each with its own rules and margin,
 * which on a phone read as a run of empty lines.
 */
export function AccountTools({
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
      setShareError(response.error || menu.shareFailed);
    }
  };

  const link = 'inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label transition-colors';

  return (
    <div className="mt-6">
      {handle && (
        <p className="text-meta text-muted-foreground">
          {menu.signedInAs} <span className="font-bold text-foreground">@{handle}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5">
        {handle && (
          <>
            <a href={publicMapPath(handle)} className={cn(link, 'text-secondary hover:text-primary')}>
              {publicMap.memberLink}
            </a>
            <button
              type="button"
              onClick={share}
              disabled={shareState !== 'idle'}
              className={cn(link, 'text-secondary hover:text-primary disabled:text-muted-foreground')}
            >
              {shareState === 'shared' ? menu.shared : menu.share}
            </button>
            <a href="/assistants" className={cn(link, 'text-secondary hover:text-primary')}>
              {logPage.assistants}
            </a>
            <a href={accountHref} className={cn(link, 'text-muted-foreground hover:text-foreground')}>
              {nav.account}
            </a>
            {/* A form post that answers with a redirect, like the header's: no script needed. */}
            <form method="POST" action={`${AUTH_BASE_PATH}/logout`} className="contents">
              <button type="submit" className={cn(link, 'text-muted-foreground hover:text-foreground')}>
                {nav.signOut}
              </button>
            </form>
          </>
        )}
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(link, 'text-muted-foreground hover:text-primary')}
          >
            {menu.startOver}
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
  );
}

/**
 * Start over, in two steps: the link above says what it is, this does it.
 * A coordinate built from a quiz and a ledger of pours is not something to
 * lose to a stray tap. The words are /account's, so the two cannot disagree.
 */
function StartOver({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="group" aria-label={menu.startOver} className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-ui text-muted-foreground">{account.startOverBody}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={onConfirm} className="btn btn-primary px-4">
          {account.startOverCta}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground"
        >
          {menu.startOverCancel}
        </button>
      </div>
    </div>
  );
}
