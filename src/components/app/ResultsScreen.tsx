'use client';
import { useMemo, useState } from 'react';
import type { User } from '@/app/page';
import { drinkDatabase, type Drink } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chatbot } from './Chatbot';
import { explainDrinkMatch } from '@/app/actions/explain-drink';

interface ResultsScreenProps {
  user: User;
  vibeTags?: Record<string, number>;
  onReset: () => void;
}

const quadrantDetails = {
  tl: { id: "list-tl", title: "Crisp & Classic", description: "Time-honored recipes with a refreshing, often fruity, twist." },
  tr: { id: "list-tr", title: "Crisp & Complex", description: "Elegant classics known for their botanical, dry, and refined flavors." },
  bl: { id: "list-bl", title: "Rich & Classic", description: "Comforting, spirit-forward drinks with a touch of sweetness." },
  br: { id: "list-br", title: "Rich & Complex", description: "For the adventurous drinker, these are bold, intense, and full of surprising flavor layers." },
};

const calculateDistance = (user: User, drink: Drink) => {
    return Math.sqrt(Math.pow(user.x - drink.x, 2) + Math.pow(user.y - drink.y, 2));
};

const calculateScore = (distance: number, drink: Drink, vibeTags: Record<string, number> | undefined) => {
    if (!vibeTags) return 1 / (distance + 0.1); // Avoid division by zero, prioritize distance if no tags

    let matchingTagsCount = 0;
    drink.tags.forEach(tag => {
        if (vibeTags[tag]) {
            matchingTagsCount += vibeTags[tag];
        }
    });

    // Formula: (1 / distance) + (number_of_matching_tags * 2)
    // Adding small epsilon to distance to prevent division by zero
    return (1 / (distance + 0.1)) + (matchingTagsCount * 2);
};


export function ResultsScreen({ user, vibeTags, onReset }: ResultsScreenProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const leftPercent = ((user.x + 10) / 20) * 100;
  const topPercent = ((10 - user.y) / 20) * 100;

  const xLabel = user.x < 0 ? "Classic" : "Complex";
  const yLabel = user.y > 0 ? "Crisp" : "Rich";
  const profile = `${yLabel} & ${xLabel}`;

  const whyText = `Your answers placed you at coordinates [${user.x.toFixed(1)}, ${user.y.toFixed(1)}]. This suggests that you generally enjoy drinks that are ${yLabel.toLowerCase()} and ${xLabel.toLowerCase()}.` + (vibeTags ? " We've also factored in your vibe to find the perfect match!" : " Use the matrix below to explore drinks that match your unique flavor profile!");

  const recommendations = useMemo(() => {
    // 1. Filter by hard constraints (smoke/bitter)
    let availableDrinks = drinkDatabase.filter(d => {
        if(user.filters.includes('noSmoke') && d.hasSmoke) return false;
        if(user.filters.includes('noBitter') && d.isBitter) return false;
        return true;
    });

    // 2. Identify Quadrant OR just search all if using vibeTags
    // If vibeTags exist (Layer 2), we search all (as implied by prompt "Re-order top 5 candidates...").
    // But let's stick to the Quadrant logic if we want to respect the "Flavor Profile" coordinates primarily.
    // Actually, "The Crystal Coupe" logic (Task 2) was: 1. Hard Filter, 2. Distance (Rank), 3. Vibe Sort (Re-rank).
    // This logic runs on ALL filtered drinks.
    // However, the prompt for Task 1 implied Quadrants.
    // The code I pasted previously (Task 2) did global distance sort.
    // Let's use the global distance sort + vibe sort here for the results, as it's more accurate than quadrant locking.

    // Calculate Scores and Sort
    const scoredDrinks = availableDrinks.map(drink => ({
        ...drink,
        distance: calculateDistance(user, drink),
        score: calculateScore(calculateDistance(user, drink), drink, vibeTags),
    })).sort((a, b) => b.score - a.score); // Sort descending by score

    return scoredDrinks;
  }, [user, vibeTags]);

  const heroDrink = recommendations[0];
  const runnersUp = recommendations.slice(1, 4);

  const handleExplain = async () => {
      if (!heroDrink) return;
      setLoadingExplanation(true);
      try {
          const text = await explainDrinkMatch(heroDrink.name, {
              x: user.x,
              y: user.y,
              dislikesSmoke: user.filters.includes('noSmoke'),
              dislikesBitter: user.filters.includes('noBitter'),
              // simple way to pass top vibe if possible, or just let AI infer from prompt text
          });
          setExplanation(text);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingExplanation(false);
      }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <Card className="text-center shadow-xl border-2 border-primary/5 bg-card p-6">
        <h1 className="font-headline text-4xl font-bold text-primary">Your Flavor Profile</h1>
        <p className="text-muted-foreground mt-2">Your preferences point to a taste for drinks that are:</p>
        <div className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full text-lg font-bold mt-4">
          {profile}
        </div>
      </Card>

      <Card className="bg-accent/90 text-accent-foreground shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline font-bold text-xl">Decoding Your Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{explanation ? explanation : whyText}</p>
           {!explanation && (
              <Button
                onClick={handleExplain}
                disabled={loadingExplanation}
                variant="secondary"
                className="mt-4 w-full sm:w-auto"
              >
                {loadingExplanation ? "Asking the Sommelier..." : "Why this drink?"}
              </Button>
           )}
        </CardContent>
      </Card>

      {/* New Layout: Hero + Runners Up */}
      {heroDrink && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hero Card */}
        <div className="lg:col-span-2">
            <Card className="h-full shadow-mcm border-2 border-[#B7410E] bg-[#FDFBF7] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(183,65,14,1)] transition-all duration-300">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="font-headline italic text-xl text-primary/80">Top Recommendation</span>
                            <CardTitle className="font-headline text-5xl font-bold text-primary mt-2">{heroDrink.name}</CardTitle>
                        </div>
                        <span className="text-sm font-bold tracking-widest uppercase border border-primary/20 px-3 py-1 rounded-sm text-primary/60">{heroDrink.type}</span>
                    </div>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {heroDrink.tags.map(tag => (
                                <span key={tag} className="text-xs font-bold uppercase tracking-widest text-[#B7410E] bg-[#B7410E]/10 px-2 py-1 rounded-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <p className="text-muted-foreground text-lg">
                            Matched based on your preference for {heroDrink.isBitter ? "bitter" : "balanced"} and {heroDrink.hasSmoke ? "smoky" : "clean"} flavors,
                            located in the {profile} quadrant.
                        </p>
                   </div>
                </CardContent>
            </Card>
        </div>

        {/* Runners Up */}
        <div className="lg:col-span-1 space-y-4">
            <h3 className="font-headline text-2xl font-bold text-primary mb-4">Runners Up</h3>
            {runnersUp.map((drink, index) => (
                <Card key={drink.name} className="shadow-mcm border-2 border-[#B7410E] bg-[#FDFBF7] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(183,65,14,1)] transition-all duration-300">
                    <CardHeader className="py-4">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-primary text-xl">{index + 2}. {drink.name}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest">{drink.type}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0">
                         <div className="flex flex-wrap gap-2">
                            {drink.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#B7410E]/80">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
      )}
      
      <Chatbot />
      
      <div className="text-center mt-8">
        <Button onClick={onReset} variant="outline" size="lg" className="uppercase tracking-wider font-bold border-primary/50 text-primary/80 hover:bg-primary hover:text-primary-foreground">
          Retake the Quiz
        </Button>
      </div>
    </div>
  );
}
