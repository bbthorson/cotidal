import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { DynamicState, ElicitationRecord } from '@/lib/atproto/records';

/**
 * Everything the app keeps on this device, and the one place that names it.
 * A guest's palate lives only here; a member's is a copy of their record.
 *
 * Storage can be missing (server render) or refuse (private browsing, a full
 * quota), so every read answers null and every write is best effort: losing
 * the device copy must never break the page.
 */
const KEYS = {
  profile: 'user_profile',
  /** A finished quiz's answers, until they reach the user's repository. */
  pendingAnswers: 'pending_elicitation',
  /** A guest's filter state, so their steps shrink as pours accumulate. */
  guestState: 'palate_state',
  /** A drink ordered in the harbour, until it is rated (or set aside). */
  openOrder: 'open_order',
} as const;

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept on this device; the session carries on without it.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}

export const loadProfile = () => read<UserProfile>(KEYS.profile);
export const saveProfile = (profile: UserProfile) => write(KEYS.profile, profile);
export const clearProfile = () => remove(KEYS.profile);

export const loadPendingAnswers = () => read<ElicitationRecord>(KEYS.pendingAnswers);
export const savePendingAnswers = (record: ElicitationRecord) => write(KEYS.pendingAnswers, record);
export const clearPendingAnswers = () => remove(KEYS.pendingAnswers);

export interface OpenOrder {
  drink: string;
  bar?: string;
  atHome?: boolean;
  orderedAt: string;
}

export const loadOpenOrder = () => read<OpenOrder>(KEYS.openOrder);
export const saveOpenOrder = (order: OpenOrder) => write(KEYS.openOrder, order);
export const clearOpenOrder = () => remove(KEYS.openOrder);

export const loadGuestState = () => read<DynamicState>(KEYS.guestState);
export const saveGuestState = (state: DynamicState) => write(KEYS.guestState, state);

/**
 * Forget this device's copy of the palate, after a sign-out: on a shared
 * device the next person should not find someone else's coordinate. It is
 * still on their account.
 */
export function forgetDevice(): void {
  Object.values(KEYS).forEach(remove);
}
