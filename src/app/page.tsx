'use client';
import { useState, useMemo } from 'react';
import { WelcomeScreen } from '@/components/app/WelcomeScreen';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { DiscoveryQuiz, type UserProfile, type RecommendedDrink } from '@/components/app/DiscoveryQuiz';
import type { User } from '@/lib/data';

export default function Home() {
  const [screen, setScreen] = useState<'welcome' | 'discoveryQuiz' | 'finalResults'>('welcome');
  const [user, setUser] = useState<User>({ x: 0, y: 0, filters: [] });
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(null);

  const handleStartQuiz = () => {
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setScreen('discoveryQuiz');
  };

  const handleDiscoveryQuizComplete = (profile: UserProfile, recommendations: RecommendedDrink[]) => {
    // Map profile to User type
    const filters: string[] = [];
    if (profile.dislikesSmoke) filters.push('noSmoke');
    if (profile.dislikesBitter) filters.push('noBitter');

    setUser({
        x: profile.x,
        y: profile.y,
        filters
    });
    setVibeTags(profile.vibeTags);
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
