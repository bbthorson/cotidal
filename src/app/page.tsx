'use client';
import { useState, useMemo } from 'react';
import { WelcomeScreen } from '@/components/app/WelcomeScreen';
import { QuizScreen } from '@/components/app/QuizScreen';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { DiscoveryQuiz } from '@/components/app/DiscoveryQuiz';
import { FinalResultsScreen } from '@/components/app/FinalResultsScreen';
import { questions, type QuestionOption } from '@/lib/data';

export type User = {
  x: number;
  y: number;
  filters: string[];
};

export default function Home() {
  const [screen, setScreen] = useState<'welcome' | 'quiz' | 'results' | 'discoveryQuiz' | 'finalResults'>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [user, setUser] = useState<User>({ x: 0, y: 0, filters: [] });
  const [discScore, setDiscScore] = useState<Record<string, number> | null>(null);

  const handleStartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUser({ x: 0, y: 0, filters: [] });
    setDiscScore(null);
    setScreen('quiz');
  };

  const handleAnswer = (option: QuestionOption) => {
    setUser(prevUser => {
      const newFilters = [...prevUser.filters];
      const weight = (currentQuestionIndex === 1 || currentQuestionIndex === 7) ? 1.5 : 1;

      if (option.tags.includes('noSmoke') && !newFilters.includes('noSmoke')) {
        newFilters.push('noSmoke');
      }
      if (option.tags.includes('noBitter') && !newFilters.includes('noBitter')) {
        newFilters.push('noBitter');
      }

      return {
        x: prevUser.x + option.dx * weight,
        y: prevUser.y + option.dy * weight,
        filters: newFilters,
      };
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setScreen('results');
    }
  };

  const handleRefineTaste = () => {
    setScreen('discoveryQuiz');
  };

  const handleDiscoveryQuizComplete = (score: Record<string, number>) => {
    setDiscScore(score);
    setScreen('finalResults');
  };
  
  const finalUser = useMemo(() => {
    if (screen === 'results' || screen === 'finalResults') {
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

  const progress = (currentQuestionIndex / questions.length) * 100;

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <main className="container max-w-5xl w-full transition-opacity duration-500 ease-in-out">
        {screen === 'welcome' && <WelcomeScreen onStartQuiz={handleStartQuiz} />}
        {screen === 'quiz' && (
          <QuizScreen
            question={questions[currentQuestionIndex]}
            onAnswer={handleAnswer}
            progress={progress}
          />
        )}
        {screen === 'results' && <ResultsScreen user={finalUser} onReset={handleReset} onRefineTaste={handleRefineTaste} />}
        {screen === 'discoveryQuiz' && <DiscoveryQuiz onComplete={handleDiscoveryQuizComplete} />}
        {screen === 'finalResults' && discScore && <FinalResultsScreen user={finalUser} discScore={discScore} onReset={handleReset} />}
      </main>
    </div>
  );
}
