'use server';

import { cookies } from 'next/headers';
import { publishPalateProfile, shareToFeed } from '@/lib/atproto/publish';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { z } from 'zod';

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
});

export async function publishPalate(profile: UserProfile): Promise<{ success: boolean; uri?: string; error?: string }> {
  const cookieStore = await cookies();
  const did = cookieStore.get('atproto_did')?.value;
  if (!did) return { success: false, error: 'Not connected to Bluesky' };

  const parsed = ProfileSchema.safeParse(profile);
  if (!parsed.success) return { success: false, error: 'Invalid profile data' };

  try {
    const result = await publishPalateProfile(did, parsed.data as UserProfile);
    return { success: true, uri: result.uri };
  } catch (e) {
    console.error('Failed to publish palate:', e);
    return { success: false, error: 'Failed to publish profile' };
  }
}

export async function sharePalateToFeed(
  topDrink: string,
  quadrant: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  const cookieStore = await cookies();
  const did = cookieStore.get('atproto_did')?.value;
  if (!did) return { success: false, error: 'Not connected to Bluesky' };

  if (!topDrink || topDrink.length > 100) return { success: false, error: 'Invalid drink name' };
  if (!quadrant || quadrant.length > 50) return { success: false, error: 'Invalid quadrant' };

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crystalcoupe.app';
    const result = await shareToFeed(did, topDrink, quadrant, appUrl);
    return { success: true, uri: result.uri };
  } catch (e) {
    console.error('Failed to share to feed:', e);
    return { success: false, error: 'Failed to share to Bluesky' };
  }
}
