'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RefineTasteProps {
  onStart: () => void;
}

export function RefineTaste({ onStart }: RefineTasteProps) {
  return (
    <Card className="shadow-xl border-2 border-primary/5 bg-card text-center">
      <CardHeader>
        <CardTitle className="font-headline text-3xl font-bold text-primary">
          Ready for Your Top 8?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-lg">
          You've got your general flavor profile. Now, let's dig a little deeper.
          Answer a few more questions to discover your personalized "Top 8" drink recommendations.
        </p>
        <Button onClick={onStart} size="lg" className="uppercase tracking-wider font-bold">
          Refine Your Taste
        </Button>
      </CardContent>
    </Card>
  );
}
