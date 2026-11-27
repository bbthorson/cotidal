import type { Tolerances, User } from '@/lib/drinks/data';
import type { DynamicState, Palate } from '@/lib/atproto/records';

export interface UserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
  dislikesAnise: boolean;
  vibeTags: Record<string, number>;
  /** How sure the quiz is of x and y. Absent on profiles saved before it was kept. */
  variance?: { x: number; y: number };
  /** The three EKF readings beyond x/y (`latentVector[2..4]`), once pours accumulate. */
  tolerances?: Tolerances;
}

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

/** A member's palate record as the app holds it (`UserProfile`). */
export function profileFromPalate(record: Palate): UserProfile {
  return {
    x: record.mapCoordinates?.x ?? 0,
    y: record.mapCoordinates?.y ?? 0,
    dislikesSmoke: record.aversions?.smoke ?? false,
    dislikesBitter: record.aversions?.bitter ?? false,
    dislikesAnise: record.aversions?.anise ?? false,
    vibeTags: (record.vibeTags as Record<string, number>) || {},
    ...(record.dynamicState ? { tolerances: tolerancesFromDynamic(record.dynamicState) } : {}),
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
