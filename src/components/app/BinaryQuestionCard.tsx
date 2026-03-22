'use client';
import { motion } from 'framer-motion';
import { QuestionOption } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { RefObject, useEffect, useRef, memo } from 'react';

interface BinaryQuestionCardProps {
  questionText: string;
  options: QuestionOption[];
  onAnswer: (option: QuestionOption, index: number) => void;
  isNavigating: boolean;
  selectedOptionIndex: number | null;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

export const BinaryQuestionCard = memo(function BinaryQuestionCard({
  questionText,
  options,
  onAnswer,
  isNavigating,
  selectedOptionIndex,
  titleRef
}: BinaryQuestionCardProps) {
  const isBinary = options.length === 2;

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  const isNavigatingRef = useRef(isNavigating);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

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
    <div className="space-y-8">
      <h2
        ref={titleRef}
        tabIndex={-1}
        className="font-headline text-3xl md:text-4xl text-primary leading-tight outline-none"
      >
        {questionText}
      </h2>

      <div className="space-y-1">
        {options.map((option, index) => {
          const isSelected = isNavigating && selectedOptionIndex === index;
          const isDisabled = isNavigating && !isSelected;

          return (
            <div key={index}>
              <button
                onClick={() => onAnswer(option, index)}
                disabled={isDisabled}
                className={`
                  w-full text-left py-4 px-4 transition-all duration-200 outline-none
                  font-headline text-xl md:text-2xl
                  border-l-2
                  ${isSelected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/70 hover:border-primary/40 hover:text-foreground'
                  }
                  ${isDisabled ? 'opacity-30' : ''}
                  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                `}
              >
                {option.text}
              </button>

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pl-4 ml-[2px] border-l-2 border-primary/30 py-2"
                >
                  {option.feedback ? (
                    <span className="text-sm italic text-muted-foreground">{option.feedback}</span>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
