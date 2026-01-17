'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

interface WelcomeScreenProps {
  onStartQuiz: () => void;
  onPreload?: () => void;
}

export function WelcomeScreen({ onStartQuiz, onPreload }: WelcomeScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <Card className="text-center max-w-2xl mx-auto shadow-2xl glass-dark border-primary/20">
        <CardHeader className="p-8 md:p-12">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-primary leading-tight tracking-tight outline-none"
          >
            The Crystal Coupe
          </h1>
          <CardDescription className="text-primary/80 pt-2 text-xl italic font-serif">Reveal Your Palate.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 px-8 pb-8 md:px-12 md:pb-12">
          <div className="h-0.5 w-32 bg-secondary/50" />
          <p className="max-w-prose text-lg text-foreground/90 leading-relaxed">
            Step into the light of the oracle. A curated algorithm designed to map the essence of your unique taste. Through a series of revelations, we will unveil your personal drink matrix across cocktails, wines, and spirits.
          </p>
          <Button
            onClick={onStartQuiz}
            onMouseEnter={onPreload}
            onFocus={onPreload}
            size="lg"
            className="uppercase tracking-widest font-bold shadow-lg hover:shadow-primary/20 transition-all mt-4 bg-primary text-primary-foreground hover:scale-105"
          >
            Begin the Reading
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
