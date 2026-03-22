'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { questions, drinkDatabase, Drink, QuestionTier, QuestionOption } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import { Loader2 } from 'lucide-react';
import { BinaryQuestionCard } from './BinaryQuestionCard';
import { auth } from '@/lib/firebase';
import { saveUserProfile } from '@/lib/profile-service';

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

const TIER_TITLES: Record<QuestionTier, string> = {
  calibration: 'The Basics',
  architecture: 'Your Style',
  context: 'The Details',
};

export function DiscoveryQuiz({ onComplete }: DiscoveryQuizProps) {
  const questionRef = useRef<HTMLHeadingElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    x: 0, y: 0,
    dislikesSmoke: false,
    dislikesBitter: false,
    dislikesAnise: false,
    vibeTags: {}
  });

  const [currentTier, setCurrentTier] = useState<QuestionTier>('calibration');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const getCurrentQuestions = () => {
    switch (currentTier) {
      case 'calibration': return calibrationQuestions;
      case 'architecture': return architectureQuestions;
      case 'context': return contextQuestions;
    }
  };

  const currentQuestions = getCurrentQuestions();
  const currentQuestion = currentQuestions[currentQuestionIndex];

  const totalQuestions = questions.length;
  const globalIndex = TIER_OFFSETS[currentTier] + currentQuestionIndex;
  const progress = ((globalIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (option: QuestionOption, index: number) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setSelectedOptionIndex(index);

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

    const delay = option.feedback ? 800 : 400;
    setTimeout(() => {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsNavigating(false);
        setSelectedOptionIndex(null);
      } else {
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
        }
      }
    }, delay);
  };

  const finishQuiz = (finalProfile: UserProfile) => {
    const candidates = drinkDatabase.filter(d => {
      if (finalProfile.dislikesSmoke && d.hasSmoke) return false;
      if (finalProfile.dislikesBitter && d.isBitter) return false;
      if (finalProfile.dislikesAnise && d.hasAnise) return false;
      return true;
    });

    const scoredCandidates = candidates.map(drink => {
      const dist = calculateDistance(finalProfile, drink);
      return { ...drink, distance: dist, score: 0 };
    });

    scoredCandidates.sort((a, b) => a.distance - b.distance);
    const topCandidates = scoredCandidates.slice(0, 10);

    const rankedCandidates = topCandidates.map(drink => {
      let matchScore = 0;
      drink.tags.forEach(tag => {
        if (finalProfile.vibeTags[tag]) {
          matchScore += finalProfile.vibeTags[tag];
        }
      });
      const distanceScore = 10 - Math.min(10, drink.distance);
      return { ...drink, score: distanceScore + (matchScore * 0.5) };
    });

    rankedCandidates.sort((a, b) => b.score - a.score);

    localStorage.setItem('user_profile', JSON.stringify(finalProfile));

    if (auth.currentUser) {
      saveUserProfile(auth.currentUser.uid, finalProfile).catch(e => {
        console.error("Failed to sync profile to Firestore", e);
      });
    }

    onComplete(finalProfile, rankedCandidates);
  };

  return (
    <div className="space-y-8">
      {/* Progress bar — thin line at top */}
      <div className="w-full h-0.5 bg-primary/10 rounded-full overflow-hidden" role="progressbar" aria-label="Quiz progress" aria-valuenow={progress}>
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tier label */}
      <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {TIER_TITLES[currentTier]}
      </p>

      {/* Question area */}
      <div key={currentQuestion.id} className="animate-in fade-in duration-300">
        {currentQuestion.options.length <= 3 ? (
          <BinaryQuestionCard
            questionText={currentQuestion.text}
            options={currentQuestion.options}
            onAnswer={handleAnswer}
            isNavigating={isNavigating}
            selectedOptionIndex={selectedOptionIndex}
            titleRef={questionRef}
          />
        ) : (
          <div className="space-y-8">
            <h2
              ref={questionRef}
              tabIndex={-1}
              className="font-headline text-3xl md:text-4xl text-primary leading-tight outline-none"
            >
              {currentQuestion.text}
            </h2>
            <div className="space-y-1">
              {currentQuestion.options.map((option, index) => {
                const isSelected = isNavigating && selectedOptionIndex === index;
                const isDisabled = isNavigating && !isSelected;
                return (
                  <div key={`${currentQuestion.id}-${index}`}>
                    <button
                      onClick={() => handleAnswer(option, index)}
                      disabled={isDisabled}
                      className={`
                        w-full text-left py-4 px-4 transition-all duration-200 outline-none
                        font-headline text-xl md:text-2xl
                        border-l-2
                        ${isSelected
                          ? 'border-primary text-primary'
                          : 'border-transparent text-foreground/70 hover:border-primary/40 hover:text-foreground'
                        }
                        ${isDisabled ? 'opacity-30' : ''}
                        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                      `}
                    >
                      {option.text}
                    </button>

                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pl-4 ml-[2px] border-l-2 border-primary/30 py-2"
                      >
                        {option.feedback ? (
                          <span className="text-sm italic text-muted-foreground">{option.feedback}</span>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
