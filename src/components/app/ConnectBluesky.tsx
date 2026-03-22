'use client';

import { useState } from 'react';
import { useAtprotoContext } from './AtprotoProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { publishPalate, sharePalateToFeed } from '@/app/actions/atproto-publish';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { User } from '@/lib/data';

interface ConnectBlueskyProps {
  user: User;
  vibeTags: Record<string, number>;
  heroDrinkName: string;
  quadrant: string;
}

function getQuadrant(x: number, y: number): string {
  if (x <= 0 && y >= 0) return 'Lush & Lively';
  if (x > 0 && y >= 0) return 'Crisp & Clean';
  if (x <= 0 && y < 0) return 'Decadent & Deep';
  return 'Bold & Complex';
}

export function ConnectBluesky({ user, vibeTags, heroDrinkName, quadrant }: ConnectBlueskyProps) {
  const { isEnabled, isConnected, handle, displayName, connecting, error, connect, disconnect } = useAtprotoContext();
  const [inputHandle, setInputHandle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [published, setPublished] = useState(false);
  const [shared, setShared] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isEnabled) return null;

  const handleConnect = async () => {
    if (!inputHandle.trim()) return;
    await connect(inputHandle.trim());
  };

  const handlePublish = async () => {
    setPublishing(true);
    setActionError(null);
    const profile: UserProfile = {
      x: user.x,
      y: user.y,
      dislikesSmoke: user.filters?.includes('noSmoke') ?? false,
      dislikesBitter: user.filters?.includes('noBitter') ?? false,
      dislikesAnise: user.filters?.includes('noAnise') ?? false,
      vibeTags,
    };
    const result = await publishPalate(profile);
    setPublishing(false);
    if (result.success) {
      setPublished(true);
    } else {
      setActionError(result.error || 'Failed to publish');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setActionError(null);
    const result = await sharePalateToFeed(heroDrinkName, quadrant);
    setSharing(false);
    if (result.success) {
      setShared(true);
    } else {
      setActionError(result.error || 'Failed to share');
    }
  };

  return (
    <Card className="glass-dark border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 568 501" className="w-6 h-6 text-primary fill-current" aria-hidden="true">
            <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 203.659 552 222.166C533.591 280.69 468.716 295.585 410.107 285.618C521.067 304.833 553.679 377.357 491.978 449.882C375.672 587.265 315.798 420.689 295.267 357.972C291.73 347.314 290.248 342.117 284 342.117C277.752 342.117 276.27 347.314 272.733 357.972C252.202 420.689 192.328 587.265 76.0223 449.882C14.3208 377.357 46.9335 304.833 157.893 285.618C99.2839 295.585 34.4086 280.69 16 222.166C9.94524 203.659 0 75.2916 0 57.9464C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z" />
          </svg>
          <h3 className="font-headline text-xl font-bold text-primary">
            {isConnected ? 'Connected to Bluesky' : 'Share Your Profile'}
          </h3>
        </div>

        {!isConnected ? (
          <>
            <p className="text-muted-foreground text-sm font-serif">
              Link your Bluesky to share your drink profile and see what your friends are into.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputHandle}
                onChange={(e) => setInputHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="your-handle.bsky.social"
                className="flex-1 rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                disabled={connecting}
              />
              <Button
                onClick={handleConnect}
                disabled={connecting || !inputHandle.trim()}
                className="tracking-widest uppercase text-xs"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-primary font-medium">@{handle}</span>
              {displayName && displayName !== handle && ` (${displayName})`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handlePublish}
                disabled={publishing || published}
                variant={published ? 'ghost' : 'default'}
                className="tracking-widest uppercase text-xs"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {published ? 'Palate Published' : 'Publish Palate'}
              </Button>
              <Button
                onClick={handleShare}
                disabled={sharing || shared}
                variant="outline"
                className="tracking-widest uppercase text-xs border-primary/20"
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {shared ? 'Shared to Feed' : 'Share to Feed'}
              </Button>
              <Button
                onClick={disconnect}
                variant="ghost"
                className="tracking-widest uppercase text-xs text-muted-foreground"
              >
                Disconnect
              </Button>
            </div>
            {actionError && <p className="text-destructive text-xs">{actionError}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
