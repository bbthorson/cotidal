'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QuestionOption } from '@/lib/data';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
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
  // Guard: Only enable shortcuts for true binary (2 options) questions
  const isBinary = options.length === 2;

  // Optimization: Use a ref to hold the latest callback to prevent
  // the useEffect from re-binding the event listener on every render.
  const onAnswerRef = useRef(onAnswer);

  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  // Optimization: Track isNavigating in a ref to use inside the event listener
  // without adding it to the dependency array. This prevents "thrashing" (removing/adding)
  // the global event listener every time the user answers (which toggles isNavigating).
  const isNavigatingRef = useRef(isNavigating);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    if (!isBinary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Use the ref value to check navigation state inside the callback
      if (isNavigatingRef.current) return;

      // Ignore if focus is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onAnswerRef.current(options[0], 0);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onAnswerRef.current(options[1], 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // Dependencies are now stable (options changes per question, isBinary is a derived constant per question)
    // isNavigating is REMOVED from dependencies, preventing re-binds on answer state change.
  }, [options, isBinary]);

  return (
    <div className="space-y-8 py-4">
      <h2
        ref={titleRef}
        tabIndex={-1}
        className="font-headline text-3xl md:text-4xl text-primary text-center leading-tight outline-none"
      >
        {questionText}
      </h2>
      
      <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch max-w-2xl mx-auto">
        {options.map((option, index) => {
          const isSelected = isNavigating && selectedOptionIndex === index;
          // Visual hints only for true binary questions
          const showHints = isBinary;
          const isLeft = index === 0;

          return (
            <motion.div
              key={index}
              whileHover={{ scale: isNavigating ? 1 : 1.02 }}
              whileTap={{ scale: isNavigating ? 1 : 0.98 }}
              className="flex-1"
            >
              <Button
                onClick={() => onAnswer(option, index)}
                disabled={isNavigating && !isSelected}
                variant={isSelected ? "default" : "outline"}
                aria-keyshortcuts={isLeft ? "ArrowLeft ArrowUp" : "ArrowRight ArrowDown"}
                className={`
                  w-full h-full min-h-[160px] p-8 text-xl font-serif whitespace-normal
                  flex flex-col gap-4 items-center justify-center text-center
                  transition-all duration-500 rounded-2xl group relative
                  ${isSelected ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary' : 'glass-dark border-primary/10 hover:bg-white/5'}
                `}
              >
                <span className="leading-relaxed">{option.text}</span>
                
                {/* Keyboard Hint - Only for binary questions */}
                {!isNavigating && showHints && (
                   <span aria-hidden="true" className="hidden md:flex items-center gap-1 text-[10px] tracking-widest uppercase text-muted-foreground/70 group-hover:text-primary transition-colors absolute bottom-4">
                     {isLeft ? <ArrowLeft className="w-3 h-3" /> : null}
                     {isLeft ? 'Left / Up' : 'Right / Down'}
                     {!isLeft ? <ArrowRight className="w-3 h-3" /> : null}
                   </span>
                )}

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    {option.feedback ? (
                      <span className="text-sm font-medium text-primary-foreground/90 italic bg-primary/20 px-2 py-1 rounded">
                        {option.feedback}
                      </span>
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-primary-foreground/70" />
                    )}
                  </motion.div>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
