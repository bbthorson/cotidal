'use client';
import { useState } from 'react';
import { discoveryQuestions, type DiscoveryQuestion } from '@/lib/discovery-questions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DiscoveryQuizProps {
  onComplete: (score: Record<string, number>) => void;
}

export function DiscoveryQuiz({ onComplete }: DiscoveryQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'd' | 'i' | 's' | 'c'>>({});

  const handleAnswer = (questionId: string, value: 'd' | 'i' | 's' | 'c') => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < discoveryQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const score = {
        d: 0,
        i: 0,
        s: 0,
        c: 0,
      };
      Object.values(newAnswers).forEach(val => {
        score[val]++;
      });
      onComplete(score);
    }
  };

  const currentQuestion = discoveryQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / discoveryQuestions.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl font-bold text-primary">Discover Your Top 8</CardTitle>
          <Progress value={progress} className="w-full mt-4" />
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="font-serif text-2xl">{currentQuestion.text}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                variant="outline"
                className="h-auto py-4 text-lg whitespace-normal"
              >
                {option.text}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
