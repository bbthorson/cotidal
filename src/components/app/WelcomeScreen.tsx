'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CoupeLogo } from './CoupeLogo';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onStartQuiz: () => void;
}

const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export function WelcomeScreen({ onStartQuiz }: WelcomeScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="space-y-10">
      <motion.div custom={0} initial="hidden" animate="show" variants={stagger} className="flex justify-center">
        <CoupeLogo className="w-12 h-12 text-primary" />
      </motion.div>

      <div className="text-center space-y-3">
        <motion.h1
          ref={headingRef}
          tabIndex={-1}
          custom={1}
          initial="hidden"
          animate="show"
          variants={stagger}
          className="font-headline text-5xl sm:text-6xl md:text-7xl font-bold text-primary leading-[1.1] tracking-tight outline-none"
        >
          The Crystal Coupe
        </motion.h1>
        <motion.p custom={2} initial="hidden" animate="show" variants={stagger} className="text-muted-foreground italic font-serif text-xl">
          Find your perfect drink.
        </motion.p>
      </div>

      <motion.div custom={3} initial="hidden" animate="show" variants={stagger} className="editorial-rule" />

      <motion.p custom={4} initial="hidden" animate="show" variants={stagger} className="text-center text-lg text-foreground/80 leading-relaxed max-w-prose mx-auto">
        A few quick questions about what you like, and we&apos;ll map out your flavor profile across cocktails, wines, and spirits. Think of it as a cheat sheet for your next drink order.
      </motion.p>

      <motion.div custom={5} initial="hidden" animate="show" variants={stagger} className="flex justify-center pt-4">
        <Button onClick={onStartQuiz} variant="editorial" size="lg" className="text-base gap-3">
          Begin
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
