'use client';
import { useState, useRef } from 'react';
import { questions, drinkDatabase, Drink, QuestionTier, QuestionOption } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BinaryQuestionCard } from './BinaryQuestionCard';

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

// Pre-calculate tier offsets for O(1) progress calculation
const TIER_OFFSETS = {
  calibration: 0,
  architecture: calibrationQuestions.length,
  context: calibrationQuestions.length + architectureQuestions.length,
};

export function DiscoveryQuiz({ onComplete }: DiscoveryQuizProps) {
  const questionRef = useRef<HTMLHeadingElement>(null);

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

  // State for navigation feedback
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const getCurrentQuestions = () => {
      switch(currentTier) {
          case 'calibration': return calibrationQuestions;
          case 'architecture': return architectureQuestions;
          case 'context': return contextQuestions;
      }
  };

  const currentQuestions = getCurrentQuestions();
  const currentQuestion = currentQuestions[currentQuestionIndex];

  // Calculate progress in O(1) without array scanning
  const totalQuestions = questions.length;
  const globalIndex = TIER_OFFSETS[currentTier] + currentQuestionIndex;
  const progress = ((globalIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (option: QuestionOption, index: number) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setSelectedOptionIndex(index);

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
    // Inline feedback is handled in the render method now for better UX.

    // 3. Advance Logic
    const delay = option.feedback ? 800 : 400; // Minimum 400ms delay to show feedback
    setTimeout(() => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsNavigating(false);
            setSelectedOptionIndex(null);
        } else {
            // Move to next Tier or Finish
            if (currentTier === 'calibration') {
                setCurrentTier('architecture');
                setCurrentQuestionIndex(0);
                setIsNavigating(false);
                setSelectedOptionIndex(null);
            } else if (currentTier === 'architecture') {
                setCurrentTier('context');
                setCurrentQuestionIndex(0);
                setIsNavigating(false);
                setSelectedOptionIndex(null);
            } else {
                finishQuiz(newProfile);
                // Note: Component unmounts here, so we don't reset navigation state
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
        const dist = calculateDistance(finalProfile, drink);
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
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="shadow-2xl glass-dark border-primary/20 min-h-[500px] flex flex-col">
        <CardHeader className="text-center pt-8">
          <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">
            {getTierTitle()}
          </h1>
          <div className="max-w-md mx-auto w-full mt-6">
            <motion.div
              animate={isNavigating ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Progress
                value={progress}
                className="h-1.5 bg-primary/10"
                aria-label="Quiz progress"
                aria-valuetext={`Question ${globalIndex + 1} of ${totalQuestions}`}
              />
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center px-6 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="w-full"
              onAnimationComplete={() => questionRef.current?.focus()}
            >
              {currentQuestion.options.length === 2 ? (
                <BinaryQuestionCard
                  questionText={currentQuestion.text}
                  options={currentQuestion.options}
                  onAnswer={handleAnswer}
                  isNavigating={isNavigating}
                  selectedOptionIndex={selectedOptionIndex}
                />
              ) : (
                <div className="space-y-8 py-4">
                  <h2
                    ref={questionRef}
                    tabIndex={-1}
                    className="font-headline text-3xl md:text-4xl text-primary text-center leading-tight outline-none"
                  >
                    {currentQuestion.text}
                  </h2>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = isNavigating && selectedOptionIndex === index;
                      return (
                        <Button
                          key={`${currentQuestion.id}-${index}`}
                          onClick={() => handleAnswer(option, index)}
                          disabled={isNavigating && !isSelected}
                          variant={isSelected ? "default" : "outline"}
                          className={`
                            h-auto py-8 text-xl font-serif whitespace-normal min-h-[120px] 
                            flex flex-col gap-3 transition-all duration-500 rounded-2xl
                            ${isSelected ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary scale-[1.02]' : 'glass-dark border-primary/10 hover:bg-white/5 hover:scale-[1.01]'}
                          `}
                        >
                          <div className="flex items-center gap-2 text-center">
                            {option.text}
                            {isSelected && !option.feedback && <Loader2 className="h-5 w-5 animate-spin" />}
                          </div>

                          {isSelected && option.feedback && (
                            <motion.span
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm font-medium text-primary-foreground/90 italic bg-primary/20 px-3 py-1 rounded-lg"
                            >
                              {option.feedback}
                            </motion.span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
