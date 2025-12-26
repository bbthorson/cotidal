'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { findCocktailRecipes } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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

export function Chatbot() {
  // Enhanced to capture isPending state from useActionState
  const [state, formAction, isPending] = useActionState(findCocktailRecipes, initialState);
  const [inputLength, setInputLength] = useState(0);

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
          <div className="space-y-2">
            <div className="flex justify-between">
                <Label htmlFor="ingredients-input">Your Ingredients</Label>
                <span className="text-xs text-muted-foreground">
                  {inputLength}/500
                </span>
            </div>
            <Textarea
              id="ingredients-input"
              name="ingredientsDescription"
              placeholder="e.g., 'I have some gin, lemons, sugar, and club soda... what can I make?'"
              className="min-h-[100px] text-base"
              required
              maxLength={500}
              onChange={(e) => setInputLength(e.target.value.length)}
            />
          </div>
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
           <Card className="mt-6 bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <CardHeader>
                <h3 className="text-xl font-headline font-bold text-accent flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Recommendations
                </h3>
             </CardHeader>
             <CardContent>
                <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{state.data}</p>
             </CardContent>
           </Card>
        )}
      </CardContent>
    </Card>
  );
}
