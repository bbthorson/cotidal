import { createRecentAccounts, type RecentAccounts } from '@bbthorson/atproto-cf-auth/client';

/**
 * The device's remembered Bluesky accounts, shared by `AtprotoProvider`
 * (which remembers the active member on arrival) and `useSignIn` (which shows
 * one-tap account cards and handles forgetting them).
 *
 * Kept separate from `device-store.ts` so `forgetDevice()` on sign-out clears
 * the device's copy of the palate while leaving the account card ready for a
 * one-tap return. Users remove an account with the card's `×` button.
 */
let recentAccounts: RecentAccounts | null = null;

export function getRecentAccounts(): RecentAccounts {
  recentAccounts ??= createRecentAccounts();
  return recentAccounts;
}
