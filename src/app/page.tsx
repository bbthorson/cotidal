'use client';
import { useState, useMemo, useEffect } from 'react';
import { WelcomeScreen } from '@/components/app/WelcomeScreen';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { DiscoveryQuiz, type UserProfile, type RecommendedDrink } from '@/components/app/DiscoveryQuiz';
import type { User } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/profile-service';
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [screen, setScreen] = useState<'welcome' | 'discoveryQuiz' | 'finalResults'>('welcome');
  const [user, setUser] = useState<User>({ x: 0, y: 0, filters: [] });
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    // 1. Initial Local Check for immediate UI
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      try {
        const profile: UserProfile = JSON.parse(savedProfile);
        applyProfile(profile);
      } catch (e) {
        console.error("Failed to parse local profile", e);
      }
    }

    // 2. Auth-based Sync (Source of Truth)
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
  }, []);

  const applyProfile = (profile: UserProfile) => {
    const filters: string[] = [];
    if (profile.dislikesSmoke) filters.push('noSmoke');
    if (profile.dislikesBitter) filters.push('noBitter');
    if (profile.dislikesAnise) filters.push('noAnise');

    setUser({
        x: profile.x,
        y: profile.y,
        filters,
        dislikesAnise: profile.dislikesAnise
    });
    setVibeTags(profile.vibeTags);
  };

  const handleStartQuiz = () => {
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setScreen('discoveryQuiz');
  };

  const handleDiscoveryQuizComplete = (profile: UserProfile, recommendations: RecommendedDrink[]) => {
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
      <main className="container max-w-5xl w-full transition-opacity duration-500 ease-in-out">
        {screen === 'welcome' && <WelcomeScreen onStartQuiz={handleStartQuiz} />}
        {screen === 'discoveryQuiz' && <DiscoveryQuiz onComplete={handleDiscoveryQuizComplete} />}
        {screen === 'finalResults' && vibeTags && <ResultsScreen user={finalUser} vibeTags={vibeTags} onReset={handleReset} />}
      </main>
    </div>
  );
}
