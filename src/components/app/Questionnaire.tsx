'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  QUESTION_CATEGORIES,
  type Question,
  type QuestionOption,
} from '@/lib/discovery-questions';
import { MAX_QUESTIONS } from '@/lib/belief-state';
import { quiz } from '@/lib/copy';
import { cn } from '@/lib/utils';

interface QuestionnaireProps {
  currentQuestion: Question | null;
  progress: number;
  questionCount: number;
  isNavigating: boolean;
  canGoBack: boolean;
  onSelectOption: (option: QuestionOption, index: number) => void;
  onBack: () => void;
  onExploreAsGuest: () => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * One question per screen (Flow Recommendations, R2). The site header steps
 * aside on a phone (`data-focus-mode`, see globals.css) and a focused bar
 * replaces it: back, an honest count, skip. The whole plate is the target;
 * the chosen plate takes the letterpress offset — struck through when the
 * question asks what to push away — and the quiz advances on its own.
 */
export function Questionnaire({
  currentQuestion,
  progress,
  questionCount,
  isNavigating,
  canGoBack,
  onSelectOption,
  onBack,
  onExploreAsGuest,
}: QuestionnaireProps) {
  if (!currentQuestion) {
    return (
      <div data-focus-mode className="flex min-h-dvh items-center justify-center lg:min-h-0 lg:py-20">
        <p className="font-serif text-lg italic text-muted-foreground motion-safe:animate-pulse">
          {quiz.loading}
        </p>
      </div>
    );
  }

  const number = Math.min(questionCount + 1, MAX_QUESTIONS);

  return (
    <div data-focus-mode className="-mx-6 flex min-h-dvh flex-col lg:mx-auto lg:min-h-0 lg:max-w-xl lg:pt-8">
      {/* Focused top bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isNavigating}
          aria-label={quiz.backLabel}
          className="flex min-h-11 items-center px-2 font-condensed text-meta font-semibold uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:invisible"
        >
          &larr; {quiz.back}
        </button>
        <span className="font-condensed text-sm font-bold tracking-wider tabular-nums text-foreground">
          {number} <span className="font-normal text-muted-foreground">{quiz.countJoiner} {MAX_QUESTIONS}</span>
        </span>
        <button
          type="button"
          onClick={onExploreAsGuest}
          aria-label={quiz.skipLabel}
          className="flex min-h-11 items-center px-2 font-condensed text-meta font-semibold uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {quiz.skip}
        </button>
      </div>

      {/* One hairline; the terracotta bar is how far along you are */}
      <div
        className="relative mx-6 mt-1.5 h-px bg-border"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="absolute -top-px left-0 h-0.75 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.max(number / MAX_QUESTIONS, progress / 100) * 100}%` }}
        />
      </div>

      {/* Keyed by question so the chosen plate resets between questions */}
      <QuestionStage
        key={currentQuestion.id}
        question={currentQuestion}
        isNavigating={isNavigating}
        canGoBack={canGoBack}
        onSelectOption={onSelectOption}
        onBack={onBack}
      />

      {/* The four stages, as a printed running foot */}
      <div className="mt-auto flex justify-between border-t border-border px-6 pb-7 pt-4 lg:mt-12">
        {QUESTION_CATEGORIES.map((cat) => (
          <span
            key={cat.id}
            aria-current={cat.id === currentQuestion.category ? 'step' : undefined}
            className={cn(
              'font-condensed text-xs uppercase tracking-label',
              cat.id === currentQuestion.category ? 'font-bold text-foreground' : 'text-muted-foreground'
            )}
          >
            {cat.short}
          </span>
        ))}
      </div>
    </div>
  );
}

interface QuestionStageProps {
  question: Question;
  isNavigating: boolean;
  canGoBack: boolean;
  onSelectOption: (option: QuestionOption, index: number) => void;
  onBack: () => void;
}

function QuestionStage({ question, isNavigating, canGoBack, onSelectOption, onBack }: QuestionStageProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const isElimination = question.type === 'triad';
  const category = QUESTION_CATEGORIES.find((c) => c.id === question.category);

  const pick = useCallback(
    (index: number) => {
      if (isNavigating || picked !== null) return;
      setPicked(index);
      onSelectOption(question.options[index], index);
    },
    [isNavigating, picked, onSelectOption, question]
  );

  // Keys 1–9 pick a plate; Backspace goes back. Kept from the previous
  // version, without the on-screen hints that crowded every plate.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= question.options.length) {
        e.preventDefault();
        pick(num - 1);
      } else if (e.key === 'Backspace' && canGoBack && !isNavigating) {
        e.preventDefault();
        onBack();
      }
    },
    [question, pick, canGoBack, isNavigating, onBack]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <div className="flex flex-col gap-3.5 px-6 pt-10">
        {category && <span className="label-caps text-primary">{category.label}</span>}
        <h1 className="font-serif text-title font-bold text-foreground">{question.text}</h1>
        {question.subtitle && <p className="text-ui text-muted-foreground">{question.subtitle}</p>}
      </div>

      <div className="flex flex-col gap-3 px-6 pb-8 pt-7" role="group" aria-label="Answer options">
        {question.options.map((option, index) => {
          const isPicked = picked === index;
          return (
            <button
              key={option.text}
              type="button"
              onClick={() => pick(index)}
              disabled={isNavigating && !isPicked}
              aria-pressed={isPicked}
              className={cn(
                'flex items-start gap-3.5 border bg-card p-4.5 text-left transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isPicked ? 'border-foreground shadow-mcm' : 'border-border hover:border-primary'
              )}
            >
              <span className="w-4.5 shrink-0 pt-0.5 font-condensed text-sm font-semibold tracking-widest text-primary">
                {ROMAN_NUMERALS[index] ?? index + 1}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span
                  className={cn(
                    'font-serif text-plate font-bold text-foreground',
                    isPicked && isElimination && 'line-through decoration-primary'
                  )}
                >
                  {option.text}
                </span>
                {option.note && <span className="text-sm leading-snug text-muted-foreground">{option.note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
