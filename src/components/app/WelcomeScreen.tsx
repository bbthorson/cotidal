'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

interface WelcomeScreenProps {
  onStartQuiz: () => void;
}

export function WelcomeScreen({ onStartQuiz }: WelcomeScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <Card className="text-center max-w-2xl mx-auto shadow-bar glass-dark border-primary/10 bar-texture overflow-hidden">
        <CardHeader className="p-8 md:p-12 relative z-10">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-primary leading-tight tracking-tight outline-none"
          >
            The Crystal Coupe
          </h1>
          <CardDescription className="text-foreground/60 pt-2 text-xl italic font-serif">Find your perfect drink.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 px-8 pb-8 md:px-12 md:pb-12 relative z-10">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="max-w-prose text-lg text-foreground/80 leading-relaxed">
            A few quick questions about what you like, and we&apos;ll map out your flavor profile across cocktails, wines, and spirits. Think of it as a cheat sheet for your next drink order.
          </p>
          <Button onClick={onStartQuiz} size="lg" className="uppercase tracking-widest font-bold shadow-glow hover:shadow-primary/30 transition-all mt-4 bg-primary text-primary-foreground hover:scale-105">
            Let&apos;s Go
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
