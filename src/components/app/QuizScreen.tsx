import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Question, QuestionOption } from '@/lib/data';

interface QuizScreenProps {
  question: Question;
  onAnswer: (option: QuestionOption) => void;
  progress: number;
}

export function QuizScreen({ question, onAnswer, progress }: QuizScreenProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <Card className="w-full max-w-3xl mx-auto shadow-xl border-2 border-primary/5 bg-card">
        <CardHeader className="p-8 md:p-12">
          <Progress value={progress} className="w-full mb-8 h-2" aria-label="Quiz progress" />
          <CardTitle className="font-headline text-2xl md:text-3xl text-accent font-bold">{question.text}</CardTitle>
          {question.insight && (
            <p className="text-muted-foreground mt-2 italic">{question.insight}</p>
          )}
        </CardHeader>
        <CardContent className="px-8 pb-8 md:px-12 md:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
            {question.options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto whitespace-normal text-left justify-start p-5 text-base border-accent/50 text-accent-foreground/80 bg-accent/80 hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent-foreground shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => onAnswer(option)}
              >
                {option.text}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
