import type { Tolerances, User } from '@/lib/data';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { DynamicState } from '@/lib/atproto/records';

const clamp = (n: number) => Math.max(-10, Math.min(10, n));

/** Extract the three non-2D EKF readings from a DynamicState record. */
export function tolerancesFromDynamic(state?: DynamicState | null): Tolerances | undefined {
  if (!state || !Array.isArray(state.latentVector) || state.latentVector.length < 5) return undefined;
  return {
    bitter: state.latentVector[2],
    tannin: state.latentVector[3],
    complexity: state.latentVector[4],
    eventCount: state.eventCount ?? 0,
  };
}

/** The palate as the menu reads it: a point on the map, what to leave off, and EKF tolerances. */
export function userFromProfile(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return {
    x: clamp(profile.x),
    y: clamp(profile.y),
    filters,
    dislikesAnise: profile.dislikesAnise,
    tolerances: profile.tolerances,
  };
}
