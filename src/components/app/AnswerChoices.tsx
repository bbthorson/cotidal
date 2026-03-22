'use client';
import { useEffect, useRef } from 'react';
import type { QuestionOption } from '@/lib/data';

interface AnswerChoicesProps {
  options: QuestionOption[];
  onAnswer: (option: QuestionOption, index: number) => void;
  isNavigating: boolean;
}

export function AnswerChoices({ options, onAnswer, isNavigating }: AnswerChoicesProps) {
  const isBinary = options.length === 2;

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);

  const isNavigatingRef = useRef(isNavigating);
  useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);

  useEffect(() => {
    if (!isBinary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isNavigatingRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onAnswerRef.current(options[0], 0);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onAnswerRef.current(options[1], 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, isBinary]);

  return (
    <div className="space-y-1">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onAnswer(option, index)}
          disabled={isNavigating}
          className={`
            w-full text-left py-3 px-4 transition-all duration-200 outline-none
            font-headline text-lg md:text-xl
            border-l-2 border-transparent
            text-foreground/70 hover:border-primary/40 hover:text-foreground
            disabled:opacity-30
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
          `}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}
