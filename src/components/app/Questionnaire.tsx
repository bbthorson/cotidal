'use client';

import { useEffect, useCallback } from 'react';
import { CoupeLogo } from './CoupeLogo';
import {
  QUESTION_CATEGORIES,
  type Question,
  type QuestionOption,
} from '@/lib/discovery-questions';

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
  // Keyboard navigation: keys 1-9 select option directly
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isNavigating || !currentQuestion) return;

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= currentQuestion.options.length) {
        e.preventDefault();
        onSelectOption(currentQuestion.options[num - 1], num - 1);
      } else if (e.key === 'Backspace' && canGoBack) {
        e.preventDefault();
        onBack();
      }
    },
    [isNavigating, currentQuestion, onSelectOption, canGoBack, onBack]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="text-center space-y-3 animate-pulse">
          <p className="font-serif text-lg italic text-muted-foreground">
            Locating your coordinate…
          </p>
        </div>
      </div>
    );
  }

  const currentCategory = currentQuestion.category;

  return (
    <div className="bar-texture min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Appbar */}
      <header className="border-b border-border/80 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <CoupeLogo className="h-7 w-7 text-primary" />
            <span className="font-serif text-sm font-bold uppercase tracking-wordmark text-foreground">
              The Crystal Coupe
            </span>
          </a>

          <button
            onClick={onExploreAsGuest}
            className="font-condensed text-xs font-bold uppercase tracking-label text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            Skip to map &rarr;
          </button>
        </div>
      </header>

      {/* Category Stepper Bar */}
      <div className="border-b border-border/60 bg-card/40 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <nav aria-label="Questionnaire stages" className="flex items-center justify-between text-center">
            {QUESTION_CATEGORIES.map((cat) => {
              const isActive = cat.id === currentCategory;
              return (
                <div
                  key={cat.id}
                  className={`flex flex-col items-center flex-1 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                >
                  <span className="font-condensed text-3xs uppercase tracking-widest font-semibold">
                    {cat.index}. {cat.label}
                  </span>
                  <span className="hidden sm:inline font-serif text-3xs italic text-muted-foreground/80">
                    {cat.description}
                  </span>
                </div>
              );
            })}
          </nav>

          {/* Progress Hairline Rule */}
          <div
            className="w-full h-0.5 bg-border/60 rounded-full mt-2.5 overflow-hidden"
            role="progressbar"
            aria-label="Calibration certainty progress"
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.max(8, progress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Questionnaire Stage */}
      <main className="flex-1 flex flex-col justify-center px-6 py-10 md:py-16">
        <div className="max-w-2xl mx-auto w-full space-y-8">
          {/* Section Eyebrow & Specimen Indicator */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="label-caps text-primary">
              Section {currentQuestion.sectionNumber} &middot; {currentQuestion.category.toUpperCase()}
            </span>
            <span className="font-mono text-3xs uppercase tracking-widest text-muted-foreground">
              Specimen {questionCount + 1}
            </span>
          </div>

          {/* Question Headline */}
          <div className="space-y-2">
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-snug">
              {currentQuestion.text}
            </h1>
            {currentQuestion.subtitle && (
              <p className="font-serif text-sm italic text-muted-foreground">
                {currentQuestion.subtitle}
              </p>
            )}
          </div>

          {/* Option Plates (Ledger Rows) */}
          <div className="space-y-3 pt-2" role="group" aria-label="Answer options">
            {currentQuestion.options.map((option, index) => {
              const roman = ROMAN_NUMERALS[index] || `${index + 1}`;
              const keyHint = index + 1;

              return (
                <button
                  key={option.text}
                  onClick={() => onSelectOption(option, index)}
                  disabled={isNavigating}
                  className="
                    group w-full text-left p-4 md:p-5
                    border border-border bg-card
                    hover:border-foreground/50 hover:shadow-bar
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    transition-all duration-150 rounded-sm
                    flex items-start justify-between gap-4
                  "
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0 mt-0.5">
                      [{roman}]
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-serif text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {option.text}
                      </p>
                      {option.note && (
                        <p className="font-serif text-xs md:text-sm italic text-muted-foreground group-hover:text-foreground/80 transition-colors">
                          {option.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 border border-border/80 font-mono text-3xs text-muted-foreground/60 group-hover:border-primary group-hover:text-primary transition-colors shrink-0 rounded">
                    Key {keyHint}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls / Undo */}
          <div className="pt-4 flex items-center justify-between border-t border-border/60">
            {canGoBack ? (
              <button
                onClick={onBack}
                disabled={isNavigating}
                className="font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary px-2 py-1"
              >
                &larr; Previous question
              </button>
            ) : (
              <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground/40">
                Beginning of calibration
              </span>
            )}

            <span className="font-condensed text-3xs uppercase tracking-label text-muted-foreground/60 hidden sm:inline">
              Press 1–{currentQuestion.options.length} to select
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
