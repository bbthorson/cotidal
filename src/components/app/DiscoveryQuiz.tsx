'use client';
import { useState } from 'react';
import { questions, drinkDatabase, Drink, QuestionTier, QuestionOption } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export interface UserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
  dislikesAnise: boolean;
  vibeTags: Record<string, number>;
}

export interface RecommendedDrink extends Drink {
  score: number;
  explanation?: string;
}

interface DiscoveryQuizProps {
  onComplete: (profile: UserProfile, recommendations: RecommendedDrink[]) => void;
}

// Filter questions by tier outside the component to avoid re-filtering on every render
const calibrationQuestions = questions.filter(q => q.tier === 'calibration');
const architectureQuestions = questions.filter(q => q.tier === 'architecture');
const contextQuestions = questions.filter(q => q.tier === 'context');

export function DiscoveryQuiz({ onComplete }: DiscoveryQuizProps) {
  const { toast } = useToast();

  // State for user profile
  const [profile, setProfile] = useState<UserProfile>({
    x: 0,
    y: 0,
    dislikesSmoke: false,
    dislikesBitter: false,
    dislikesAnise: false,
    vibeTags: {}
  });

  // State for quiz progress
  const [currentTier, setCurrentTier] = useState<QuestionTier>('calibration');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getCurrentQuestions = () => {
      switch(currentTier) {
          case 'calibration': return calibrationQuestions;
          case 'architecture': return architectureQuestions;
          case 'context': return contextQuestions;
      }
  };

  const currentQuestions = getCurrentQuestions();
  const currentQuestion = currentQuestions[currentQuestionIndex];

  // Calculate progress
  const totalQuestions = questions.length;
  const globalIndex = questions.findIndex(q => q.id === currentQuestion?.id);
  const progress = ((globalIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (option: QuestionOption) => {
    // 1. Update Profile Logic
    const newProfile = { ...profile };
    newProfile.x = Math.max(-10, Math.min(10, newProfile.x + option.dx));
    newProfile.y = Math.max(-10, Math.min(10, newProfile.y + option.dy));

    if (option.filterFlag) {
      if (option.filterFlag.key === 'dislikesSmoke') newProfile.dislikesSmoke = option.filterFlag.value;
      if (option.filterFlag.key === 'dislikesBitter') newProfile.dislikesBitter = option.filterFlag.value;
      if (option.filterFlag.key === 'dislikesAnise') newProfile.dislikesAnise = option.filterFlag.value;
    }

    if (option.vibeTags) {
        option.vibeTags.forEach(tag => {
            newProfile.vibeTags[tag] = (newProfile.vibeTags[tag] || 0) + 1;
        });
    }

    setProfile(newProfile);

    // 2. Feedback Logic
    if (option.feedback) {
      toast({ description: option.feedback });
    }

    // 3. Advance Logic
    const delay = option.feedback ? 800 : 200;
    setTimeout(() => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // Move to next Tier or Finish
            if (currentTier === 'calibration') {
                setCurrentTier('architecture');
                setCurrentQuestionIndex(0);
            } else if (currentTier === 'architecture') {
                setCurrentTier('context');
                setCurrentQuestionIndex(0);
            } else {
                finishQuiz(newProfile);
            }
        }
    }, delay);
  };

  const finishQuiz = (finalProfile: UserProfile) => {
    // 1. Filter (Hard constraints)
    let candidates = drinkDatabase.filter(drink => {
        if (finalProfile.dislikesSmoke && drink.hasSmoke) return false;
        if (finalProfile.dislikesBitter && drink.isBitter) return false;
        if (finalProfile.dislikesAnise && drink.hasAnise) return false;
        return true;
    });

    // 2. Rank (Distance)
    const scoredCandidates = candidates.map(drink => {
        const dist = Math.sqrt(Math.pow(drink.x - finalProfile.x, 2) + Math.pow(drink.y - finalProfile.y, 2));
        return { ...drink, distance: dist, score: 0 };
    });

    // Sort by distance ascending (closest first)
    scoredCandidates.sort((a, b) => a.distance - b.distance);

    // Take top 10 closest for Vibe refinement
    const topCandidates = scoredCandidates.slice(0, 10);

    // 3. Vibe Sort (within the top candidates)
    const rankedCandidates = topCandidates.map(drink => {
        let matchScore = 0;
        drink.tags.forEach(tag => {
            if (finalProfile.vibeTags[tag]) {
                matchScore += finalProfile.vibeTags[tag];
            }
        });

        // Final Score combines distance (inverse) and vibe match
        // We want higher score = better match.
        // Distance 0 should be high score.
        const distanceScore = 10 - Math.min(10, drink.distance);

        return { ...drink, score: distanceScore + (matchScore * 0.5) };
    });

    // Sort by Final Score descending
    rankedCandidates.sort((a, b) => b.score - a.score);

    // Save to local storage
    localStorage.setItem('user_profile', JSON.stringify(finalProfile));

    // Call onComplete
    onComplete(finalProfile, rankedCandidates);
  };

  const getTierTitle = () => {
      switch(currentTier) {
          case 'calibration': return 'Phase 1: Calibration';
          case 'architecture': return 'Phase 2: Architecture';
          case 'context': return 'Phase 3: Context';
      }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl font-bold text-primary">
            {getTierTitle()}
          </CardTitle>
          <Progress value={progress} className="w-full mt-4" />
        </CardHeader>
        <CardContent className="text-center space-y-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-6"
            >
              <p className="font-serif text-2xl">{currentQuestion.text}</p>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={`${currentQuestion.id}-${index}`}
                    onClick={() => handleAnswer(option)}
                    variant="outline"
                    className="h-auto py-4 text-lg whitespace-normal min-h-[60px]"
                  >
                    {option.text}
                  </Button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
