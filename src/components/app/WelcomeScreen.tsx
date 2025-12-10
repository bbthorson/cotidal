import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WelcomeScreenProps {
  onStartQuiz: () => void;
}

export function WelcomeScreen({ onStartQuiz }: WelcomeScreenProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <Card className="text-center max-w-2xl mx-auto shadow-xl border-2 border-primary/5 bg-card">
        <CardHeader className="p-8 md:p-12">
          <CardTitle className="font-headline text-4xl md:text-5xl font-bold text-primary">Sure Shot</CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-lg">The Palate Compass</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 px-8 pb-8 md:px-12 md:pb-12">
          <div className="h-1 w-24 bg-accent/30" />
          <p className="max-w-prose text-lg">
            A somm-driven algorithm designed to map your unique taste profile. Answer a few questions to discover your personalized drink matrix of cocktails, wines, and beers.
          </p>
          <Button onClick={onStartQuiz} size="lg" className="uppercase tracking-wider font-bold shadow-md hover:shadow-lg transition-shadow mt-4">
            Start Tasting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
