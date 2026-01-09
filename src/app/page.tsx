'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { WelcomeScreen } from '@/components/app/WelcomeScreen';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { DiscoveryQuiz, type UserProfile } from '@/components/app/DiscoveryQuiz';
import type { User } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/profile-service';
import { onAuthStateChanged } from 'firebase/auth';

// Read localStorage during hydration to avoid the set-state-in-effect rule
function getInitialProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const savedProfile = localStorage.getItem('user_profile');
  if (savedProfile) {
    try {
      return JSON.parse(savedProfile) as UserProfile;
    } catch {
      return null;
    }
  }
  return null;
}

function profileToUser(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return {
    x: profile.x,
    y: profile.y,
    filters,
    dislikesAnise: profile.dislikesAnise
  };
}

export default function Home() {
  // Initialize from localStorage synchronously to avoid effect-based setState
  const initialProfile = useMemo(() => getInitialProfile(), []);
  const [screen, setScreen] = useState<'welcome' | 'discoveryQuiz' | 'finalResults'>(
    initialProfile ? 'finalResults' : 'welcome'
  );
  const [user, setUser] = useState<User>(() => profileToUser(initialProfile));
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(initialProfile?.vibeTags ?? null);

  const applyProfile = useCallback((profile: UserProfile) => {
    setUser(profileToUser(profile));
    setVibeTags(profile.vibeTags);
  }, []);

  useEffect(() => {
    // Auth-based Sync (Source of Truth) - setState is in callback, not synchronously
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cloudProfile = await getUserProfile(firebaseUser.uid);
        if (cloudProfile) {
          applyProfile(cloudProfile);
          setScreen('finalResults');
        }
      }
    });

    return () => unsubscribe();
  }, [applyProfile]);

  const handleStartQuiz = () => {
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setScreen('discoveryQuiz');
  };

  const handleDiscoveryQuizComplete = (profile: UserProfile) => {
    applyProfile(profile);
    setScreen('finalResults');
  };

  const finalUser = useMemo(() => {
    if (screen === 'finalResults') {
      return {
        ...user,
        x: Math.max(-10, Math.min(10, user.x)),
        y: Math.max(-10, Math.min(10, user.y)),
      }
    }
    return user;
  }, [user, screen]);

  const handleReset = () => {
    localStorage.removeItem('user_profile');
    setScreen('welcome');
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <main id="main-content" className="container max-w-5xl w-full transition-opacity duration-500 ease-in-out" tabIndex={-1}>
        {screen === 'welcome' && <WelcomeScreen onStartQuiz={handleStartQuiz} />}
        {screen === 'discoveryQuiz' && <DiscoveryQuiz onComplete={handleDiscoveryQuizComplete} />}
        {screen === 'finalResults' && vibeTags && <ResultsScreen user={finalUser} vibeTags={vibeTags} onReset={handleReset} />}
      </main>
    </div>
  );
}
