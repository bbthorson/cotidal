import type { User } from '@/lib/data';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

const clamp = (n: number) => Math.max(-10, Math.min(10, n));

/** The palate as the menu reads it: a point on the map, and what to leave off. */
export function userFromProfile(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return { x: clamp(profile.x), y: clamp(profile.y), filters, dislikesAnise: profile.dislikesAnise };
}
