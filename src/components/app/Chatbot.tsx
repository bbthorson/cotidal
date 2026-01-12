'use client';

import { useActionState, useState, useId, memo } from 'react';
import { useFormStatus } from 'react-dom';
import { findCocktailRecipes } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-11 w-11 hover:bg-primary/10 transition-all duration-200"
            aria-label={copied ? "Copied to clipboard" : "Copy recommendations"}
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-600 scale-110" aria-hidden="true" />
            ) : (
              <Copy className="h-5 w-5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

export const Chatbot = memo(function Chatbot() {
  const [state, formAction, isPending] = useActionState(findCocktailRecipes, initialState);

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
          <Alert variant="destructive" className="mt-4 animate-in fade-in slide-in-from-top-2">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Card className="mt-6 bg-muted/30 border-dashed animate-in fade-in duration-500">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-primary/50" />
              </motion.div>
              <div className="space-y-1">
                <p className="font-headline font-bold text-lg text-primary">Mixing up some ideas...</p>
                <p className="text-sm text-muted-foreground">Consulting the cocktail matrix.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isPending && state.data && (
          <Card
            className="mt-6 bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
            role="status"
            aria-live="polite"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-xl font-headline font-bold text-accent flex items-center gap-2">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                AI Recommendations
              </h3>
              <CopyButton text={state.data} />
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{state.data}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
});
