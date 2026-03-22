import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, limit } from 'firebase/firestore';
import type { UserProfile } from '@/components/app/DiscoveryQuiz';

const COLLECTION_NAME = 'profiles';

export async function saveUserProfile(userId: string, profile: UserProfile, atprotoDid?: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const data: Record<string, unknown> = {
      ...profile,
      updatedAt: serverTimestamp(),
    };
    if (atprotoDid) {
      data.atprotoDid = atprotoDid;
    }
    await setDoc(docRef, data, { merge: true });

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

export async function getProfileByDid(did: string): Promise<UserProfile | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('atprotoDid', '==', did),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as UserProfile;
  } catch (e) {
    console.error("Error getting profile by DID:", e);
    return null;
  }
}
