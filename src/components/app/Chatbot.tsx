'use client';

import { useActionState, useState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { findCocktailRecipes } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState = {
  data: '',
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto uppercase tracking-wider font-bold">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Find Recipes
    </Button>
  );
}

// Optimization: Extract Input component to isolate re-renders caused by character counting.
// This prevents the entire Chatbot card (and potentially parent components) from re-rendering on every keystroke.
function ChatInput() {
  const [inputLength, setInputLength] = useState(0);
  const maxLength = 500;
  const isNearLimit = inputLength > maxLength * 0.9;
  const isAtLimit = inputLength >= maxLength;

  // Use unique IDs to ensure component reusability and accessibility compliance
  const id = useId();
  const counterId = `${id}-counter`;
  const inputId = `${id}-input`;

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
          <Label htmlFor={inputId}>Your Ingredients</Label>
          <span
            id={counterId}
            className={cn(
              "text-xs transition-colors duration-200 font-medium",
              isAtLimit ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-muted-foreground"
            )}
            aria-live={isNearLimit ? "polite" : "off"}
          >
            <span className="sr-only">Characters used: </span>
            {inputLength}/{maxLength}
          </span>
      </div>
      <Textarea
        id={inputId}
        name="ingredientsDescription"
        placeholder="e.g., 'I have some gin, lemons, sugar, and club soda... what can I make?'"
        className="min-h-[100px] text-base"
        required
        maxLength={maxLength}
        aria-describedby={counterId}
        onChange={(e) => setInputLength(e.target.value.length)}
      />
    </div>
  );
}

export function Chatbot() {
  const [state, formAction] = useActionState(findCocktailRecipes, initialState);

  return (
    <Card className="shadow-xl border-2 border-primary/5 bg-card">
      <CardHeader>
        <h2 className="font-headline text-3xl font-bold text-primary flex items-center gap-2">
          <Bot />
          Drink Discovery Chat
        </h2>
        <CardDescription>
          Have some ingredients but not sure what to make? Describe what you have, and our AI-bartender will suggest some cocktails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <ChatInput />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>

        {state.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state.data && (
           <Card className="mt-6 bg-muted/50">
             <CardHeader>
                <h3 className="text-xl font-headline font-bold text-accent">AI Recommendations</h3>
             </CardHeader>
             <CardContent>
                <p className="whitespace-pre-wrap font-mono text-sm">{state.data}</p>
             </CardContent>
           </Card>
        )}
      </CardContent>
    </Card>
  );
}
