'use client';
import { useState } from 'react';
import { questions as sensoryQuestions, drinkDatabase, Drink } from '@/lib/data';
import { discoveryQuestions } from '@/lib/discovery-questions';
import type { QuestionOption } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
  vibeTags: Record<string, number>;
}

export interface RecommendedDrink extends Drink {
  score: number;
  explanation?: string; // Placeholder for AI explanation if we fetch it later
}

interface DiscoveryQuizProps {
  onComplete: (profile: UserProfile, recommendations: RecommendedDrink[]) => void;
}

export function DiscoveryQuiz({ onComplete }: DiscoveryQuizProps) {
  const { toast } = useToast();

  // State for user profile
  const [profile, setProfile] = useState<UserProfile>({
    x: 0,
    y: 0,
    dislikesSmoke: false,
    dislikesBitter: false,
    vibeTags: {}
  });

  // State for quiz progress
  const [stage, setStage] = useState<'sensory' | 'vibe'>('sensory');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Helper to determine current questions set
  const currentQuestions = stage === 'sensory' ? sensoryQuestions : discoveryQuestions;
  const currentQuestion = currentQuestions[currentQuestionIndex];

  // Calculate progress
  // Sensory stage is 0-50%, Vibe stage is 50-100%? Or just one long bar?
  // Let's do one continuous progress bar for simplicity.
  const totalQuestions = sensoryQuestions.length + discoveryQuestions.length;
  const globalIndex = stage === 'sensory' ? currentQuestionIndex : sensoryQuestions.length + currentQuestionIndex;
  const progress = ((globalIndex + 1) / totalQuestions) * 100;

  const handleSensoryAnswer = (option: QuestionOption) => {
    // 1. Update Profile Logic
    const newProfile = { ...profile };
    newProfile.x = Math.max(-10, Math.min(10, newProfile.x + option.dx));
    newProfile.y = Math.max(-10, Math.min(10, newProfile.y + option.dy));

    if (option.flags) {
      if (option.flags.dislikesSmoke !== undefined) newProfile.dislikesSmoke = option.flags.dislikesSmoke;
      if (option.flags.dislikesBitter !== undefined) newProfile.dislikesBitter = option.flags.dislikesBitter;
    }

    setProfile(newProfile);

    // 2. Feedback Logic
    if (option.feedback) {
      toast({ description: option.feedback });
    }

    // 3. Advance Logic (with delay if feedback)
    const delay = option.feedback ? 1500 : 0;
    setTimeout(() => {
        if (currentQuestionIndex < sensoryQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // Move to Stage 2
            setStage('vibe');
            setCurrentQuestionIndex(0);
        }
    }, delay);
  };

  const handleVibeAnswer = (option: any) => { // Type 'any' because discoveryQuestions has slightly different option structure
    const newProfile = { ...profile };
    // Assuming option.vibeTags is string[]
    const tags = option.vibeTags as string[];

    tags.forEach(tag => {
        newProfile.vibeTags[tag] = (newProfile.vibeTags[tag] || 0) + 1;
    });

    setProfile(newProfile);

    if (currentQuestionIndex < discoveryQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
        // FINISHED! Calculate Results.
        finishQuiz(newProfile);
    }
  };

  const finishQuiz = (finalProfile: UserProfile) => {
    // 1. Filter (Hard constraints)
    let candidates = drinkDatabase.filter(drink => {
        if (finalProfile.dislikesSmoke && drink.hasSmoke) return false;
        // if (finalProfile.dislikesBitter && drink.isBitter) return false; // Wait, prompt said: "Constraint: dislikesBitter" but didn't explicitly say "Remove any drink where drink.isBitter is true IF profile.dislikesBitter is true" like it did for smoke. It just said "Step 1 (Hard Filter): Remove any drink where drink.hasSmoke is true IF profile.dislikesSmoke is true."
        // However, it's implied by "Constraints: Add boolean flags...". Let's assume bitter is also a hard filter if dislikesBitter is true.
        // Re-reading prompt: "Step 1 (Hard Filter): Remove any drink where drink.hasSmoke is true IF profile.dislikesSmoke is true." It ONLY mentions smoke there.
        // But in Task 1: "Constraints: Add boolean flags to Drink: hasSmoke and isBitter."
        // I will apply bitter filter too, logic dictates it operates similarly.
        if (finalProfile.dislikesBitter && drink.isBitter) return false;
        return true;
    });

    // 2. Rank (Distance)
    // "Find drinks closest to the user's final (x, y) using Euclidean distance."
    const scoredCandidates = candidates.map(drink => {
        const dist = Math.sqrt(Math.pow(drink.x - finalProfile.x, 2) + Math.pow(drink.y - finalProfile.y, 2));
        // We want closest distance.
        return { ...drink, distance: dist, vibeScore: 0, finalScore: 0 };
    });

    // Sort by distance ascending to find "Quadrant Match" (closest neighbors)
    // Prompt says: "Step 3 (Vibe Sort): Re-order the top 5 candidates based on how many vibeTags they share..."
    scoredCandidates.sort((a, b) => a.distance - b.distance);

    // Take top 5 closest
    const topCandidates = scoredCandidates.slice(0, 5);

    // 3. Vibe Sort
    // Calculate Vibe Match Score
    const rankedCandidates = topCandidates.map(drink => {
        let matchScore = 0;
        drink.tags.forEach(tag => {
            if (finalProfile.vibeTags[tag]) {
                matchScore += finalProfile.vibeTags[tag];
            }
        });

        // We need to re-order based on this matchScore.
        // Note: The prompt says "Re-order... based on how many vibeTags they share".
        // It doesn't explicitly say combine distance and vibe, but implies Vibe determines the order OF the top 5.
        return { ...drink, score: matchScore };
    });

    // Sort by Vibe Score descending
    rankedCandidates.sort((a, b) => b.score - a.score);

    // Call onComplete
    onComplete(finalProfile, rankedCandidates);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl font-bold text-primary">
            {stage === 'sensory' ? 'Sensory Calibration' : 'Vibe Check'}
          </CardTitle>
          <Progress value={progress} className="w-full mt-4" />
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="font-serif text-2xl">{currentQuestion.text}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/*
                We need to handle rendering slightly differently because `questions` (sensory) and `discoveryQuestions` (vibe)
                have different structures. `questions` has `dx`, `dy`, `flags`. `discoveryQuestions` has `vibeTags`.
            */}
            {stage === 'sensory' ? (
                 (currentQuestion as any).options.map((option: QuestionOption, index: number) => (
                    <Button
                      key={`${currentQuestion.text}-${index}`} // Using text-index as key
                      onClick={() => handleSensoryAnswer(option)}
                      variant="outline"
                      className="h-auto py-4 text-lg whitespace-normal"
                    >
                      {option.text}
                    </Button>
                  ))
            ) : (
                (currentQuestion as any).options.map((option: any, index: number) => (
                    <Button
                      key={`${currentQuestion.id}-${index}`} // discoveryQuestions use id
                      onClick={() => handleVibeAnswer(option)}
                      variant="outline"
                      className="h-auto py-4 text-lg whitespace-normal"
                    >
                      {option.text}
                    </Button>
                  ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
