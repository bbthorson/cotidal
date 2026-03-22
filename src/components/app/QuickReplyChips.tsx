'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionOption } from '@/lib/discovery-questions';

interface QuickReplyChipsProps {
  options: QuestionOption[];
  onSelect: (option: QuestionOption, index: number) => void;
  disabled: boolean;
}

export function QuickReplyChips({ options, onSelect, disabled }: QuickReplyChipsProps) {
  const isBinary = options.length === 2;
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  // Arrow key shortcuts for binary questions (when textarea not focused)
  useEffect(() => {
    if (!isBinary) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabledRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onSelectRef.current(options[0], 0);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onSelectRef.current(options[1], 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, isBinary]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-wrap gap-2 pt-2"
      >
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(option, index)}
            disabled={disabled}
            className="
              px-4 py-2 text-sm rounded-full transition-all duration-200 outline-none
              border border-primary/20 text-foreground/70
              hover:border-primary/50 hover:text-foreground hover:bg-primary/5
              disabled:opacity-30
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
            "
          >
            {option.text}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
