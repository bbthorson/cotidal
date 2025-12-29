'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QuestionOption } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { RefObject } from 'react';

interface BinaryQuestionCardProps {
  questionText: string;
  options: QuestionOption[];
  onAnswer: (option: QuestionOption, index: number) => void;
  isNavigating: boolean;
  selectedOptionIndex: number | null;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

export function BinaryQuestionCard({
  questionText,
  options,
  onAnswer,
  isNavigating,
  selectedOptionIndex,
  titleRef
}: BinaryQuestionCardProps) {
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
                className={`
                  w-full h-full min-h-[160px] p-8 text-xl font-serif whitespace-normal
                  flex flex-col gap-4 items-center justify-center text-center
                  transition-all duration-500 rounded-2xl
                  ${isSelected ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary' : 'glass-dark border-primary/10 hover:bg-white/5'}
                `}
              >
                <span className="leading-relaxed">{option.text}</span>
                
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
}
