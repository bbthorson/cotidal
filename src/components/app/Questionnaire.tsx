import { useEffect, useCallback, useState } from 'react';
import {
  QUESTION_CATEGORIES,
  type Question,
  type QuestionOption,
} from '@/lib/palate/discovery-questions';
import { MAX_QUESTIONS } from '@/lib/palate/belief-state';
import { a11y, quiz } from '@/lib/copy';
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
 * One question at a time, in the card over the map: where the answers point
 * so far is the shoal on the map itself (`Questions.tsx`). The site header
 * steps aside on a phone (`data-focus-mode`, see globals.css) and a focused
 * bar replaces it: back, an honest count, skip. The whole plate is the
 * target; the chosen plate takes the letterpress offset — struck through when
 * the question asks what to push away — and the quiz advances on its own.
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
      <div data-focus-mode className="flex min-h-40 items-center justify-center">
        <p className="font-serif text-plate italic text-muted-foreground motion-safe:animate-pulse">
          {quiz.loading}
        </p>
      </div>
    );
  }

  const number = Math.min(questionCount + 1, MAX_QUESTIONS);

  return (
    <div data-focus-mode className="flex flex-col">
      {/* Focused top bar */}
      <div className="-mx-2 flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isNavigating}
          aria-label={quiz.backLabel}
          className="link-caps px-2 text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
        >
          &larr; {quiz.back}
        </button>
        <span className="font-condensed text-ui font-bold tracking-label tabular-nums text-foreground">
          {number} <span className="font-normal text-muted-foreground">{quiz.countJoiner} {MAX_QUESTIONS}</span>
        </span>
        <button
          type="button"
          onClick={onExploreAsGuest}
          aria-label={quiz.skipLabel}
          className="link-caps px-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {quiz.skip}
        </button>
      </div>

      {/* One hairline; the terracotta bar is how far along you are */}
      <div
        className="relative mt-1.5 h-px bg-border"
        role="progressbar"
        aria-label={a11y.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="absolute -top-px left-0 h-0.75 bg-foreground transition-all duration-500 ease-out"
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

      <p className="flex items-center gap-2 pb-2 text-meta text-muted-foreground">
        <span aria-hidden="true" className="inline-block h-3 w-5 rounded-full border border-dashed border-secondary bg-shoal" />
        {quiz.narrowing}
      </p>
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
  // Two glasses side by side, even on a phone: the choice is a comparison,
  // so the plates should be read together rather than down a list.
  const isPair = question.type === 'pair' && question.options.length === 2;
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
      {/* On a phone the question and every plate fit one screen under the map (tests/quiz-flow.spec.ts): the type is a size smaller and the plates tighter than from `lg`. */}
      <div className="flex flex-col gap-1.5 pt-3 lg:gap-3.5 lg:pt-6">
        {category && <span className="label-caps">{category.label}</span>}
        <h1 className="font-serif text-subtitle font-bold text-foreground lg:text-title">{question.text}</h1>
        {question.subtitle && <p className="text-meta text-muted-foreground lg:text-ui">{question.subtitle}</p>}
      </div>

      <div
        className={cn('pb-3 pt-3 lg:pb-5 lg:pt-5', isPair ? 'grid grid-cols-2 gap-2 lg:gap-3' : 'flex flex-col gap-2 lg:gap-3')}
        role="group"
        aria-label={a11y.answerOptions}
      >
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
                'flex border bg-card px-3 py-2.5 text-left transition-colors duration-150 lg:p-4.5',
                isPair ? 'flex-col gap-1 lg:gap-2' : 'items-start gap-3 lg:gap-3.5',
                isPicked ? 'border-foreground shadow-mcm' : 'border-border hover:border-foreground'
              )}
            >
              <span className="w-4.5 shrink-0 pt-0.5 font-condensed text-ui font-semibold tracking-label text-muted-foreground">
                {ROMAN_NUMERALS[index] ?? index + 1}
              </span>
              <span className="flex flex-1 flex-col gap-0.5 lg:gap-1">
                <span
                  className={cn(
                    'font-serif text-prose font-bold text-foreground lg:text-plate',
                    isPicked && isElimination && 'line-through decoration-primary'
                  )}
                >
                  {option.text}
                </span>
                {option.note && <span className="text-meta leading-snug text-muted-foreground">{option.note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
