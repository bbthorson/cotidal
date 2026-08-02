import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

const STORAGE_KEY = 'user_profile';

export async function saveUserProfile(_userId: string, profile: UserProfile) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.error("Error saving user profile locally:", e);
  }
}

export async function getUserProfile(_userId?: string): Promise<UserProfile | null> {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    }
    return null;
  } catch (e) {
    console.error("Error getting user profile locally:", e);
    return null;
  }
}

export async function getProfileByDid(_did: string): Promise<UserProfile | null> {
  // When AT Protocol is connected, profile is retrieved directly from AT Protocol PDS
  return null;
}
