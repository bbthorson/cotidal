'use client';
import { useState, useMemo } from 'react';
import { WelcomeScreen } from '@/components/app/WelcomeScreen';
import { QuizScreen } from '@/components/app/QuizScreen';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { questions, type QuestionOption } from '@/lib/data';

export type User = {
  x: number;
  y: number;
  filters: string[];
};

export default function Home() {
  const [screen, setScreen] = useState<'welcome' | 'quiz' | 'results'>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [user, setUser] = useState<User>({ x: 0, y: 0, filters: [] });

  const handleStartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUser({ x: 0, y: 0, filters: [] });
    setScreen('quiz');
  };

  const handleAnswer = (option: QuestionOption) => {
    setUser(prevUser => {
      const newFilters = [...prevUser.filters];
      if (option.tags.includes('noSmoke') && !newFilters.includes('noSmoke')) {
        newFilters.push('noSmoke');
      }
      if (option.tags.includes('noBitter') && !newFilters.includes('noBitter')) {
        newFilters.push('noBitter');
      }
      return {
        x: prevUser.x + option.dx,
        y: prevUser.y + option.dy,
        filters: newFilters,
      };
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setScreen('results');
    }
  };

  const finalUser = useMemo(() => {
    if (screen === 'results') {
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
        {screen === 'results' && <ResultsScreen user={finalUser} onReset={handleReset} />}
      </main>
    </div>
  );
}
