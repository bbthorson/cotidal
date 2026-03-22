'use client';

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

// Skip auth entirely when Firebase is not configured (no real API key)
const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<Error | null>(null);
  const signInAttempted = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else if (!signInAttempted.current) {
        signInAttempted.current = true;
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
        } catch (e) {
          console.error("Firebase Auth Error:", e);
          setError(e as Error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, error };
}
