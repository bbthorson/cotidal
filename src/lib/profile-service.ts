import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/components/app/DiscoveryQuiz';

const COLLECTION_NAME = 'profiles';

export async function saveUserProfile(userId: string, profile: UserProfile) {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(docRef, {
      ...profile,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update localStorage for instant access
    localStorage.setItem('user_profile', JSON.stringify(profile));
  } catch (e) {
    console.error("Error saving user profile:", e);
    throw e;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      // Update localStorage cache
      localStorage.setItem('user_profile', JSON.stringify(data));
      return data;
    }
    return null;
  } catch (e) {
    console.error("Error getting user profile:", e);
    return null;
  }
}
