'use client';
import { useMemo } from 'react';
import type { User } from '@/app/page';
import { drinkDatabase, type Drink } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chatbot } from './Chatbot';

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
  const leftPercent = ((user.x + 10) / 20) * 100;
  const topPercent = ((10 - user.y) / 20) * 100;

  const xLabel = user.x < 0 ? "Classic" : "Complex";
  const yLabel = user.y > 0 ? "Crisp" : "Rich";
  const profile = `${yLabel} & ${xLabel}`;

  const whyText = `Your answers placed you at coordinates [${user.x.toFixed(1)}, ${user.y.toFixed(1)}]. This suggests that you generally enjoy drinks that are ${yLabel.toLowerCase()} and ${xLabel.toLowerCase()}.` + (vibeTags ? " We've also factored in your vibe to find the perfect match!" : " Use the matrix below to explore drinks that match your unique flavor profile!");

  const recommendations = useMemo(() => {
    // 1. Filter by hard constraints (smoke/bitter)
    let availableDrinks = drinkDatabase.filter(d => {
        if(user.filters.includes('noSmoke') && d.smoke) return false;
        if(user.filters.includes('noBitter') && d.bitter) return false;
        return true;
    });

    // 2. Identify Quadrant
    // TL: x <= 0, y > 0
    // TR: x > 0, y > 0
    // BL: x <= 0, y <= 0
    // BR: x > 0, y <= 0
    let targetQuadrantDrinks: Drink[] = [];
    if (user.x <= 0 && user.y > 0) {
        targetQuadrantDrinks = availableDrinks.filter(d => d.x <= 0 && d.y > 0);
    } else if (user.x > 0 && user.y > 0) {
        targetQuadrantDrinks = availableDrinks.filter(d => d.x > 0 && d.y > 0);
    } else if (user.x <= 0 && user.y <= 0) {
        targetQuadrantDrinks = availableDrinks.filter(d => d.x <= 0 && d.y <= 0);
    } else { // BR
        targetQuadrantDrinks = availableDrinks.filter(d => d.x > 0 && d.y <= 0);
    }

    // Fallback if quadrant is empty (expand search or just use all available)
    if (targetQuadrantDrinks.length === 0) {
        targetQuadrantDrinks = availableDrinks;
    }

    // 3. Calculate Scores and Sort
    const scoredDrinks = targetQuadrantDrinks.map(drink => ({
        ...drink,
        distance: calculateDistance(user, drink),
        score: calculateScore(calculateDistance(user, drink), drink, vibeTags),
    })).sort((a, b) => b.score - a.score); // Sort descending by score

    return scoredDrinks;
  }, [user, vibeTags]);

  const heroDrink = recommendations[0];
  const runnersUp = recommendations.slice(1, 4);

  // If no vibe tags, show the old quadrant view (Layer 1) or simplified view?
  // The prompt says "Implement a two-layer recommendation system... Update UI Layout... Move away from symmetric 2x2 grid."
  // It implies this new layout is for the result.
  // However, initially (Layer 1), we might not have vibe tags.
  // Let's assume we use the new layout always, but without vibe tags, it's just distance-based.

  // Actually, if we are in "Layer 1" (no vibeTags), maybe we want to show the quadrants or just the top picks based on distance?
  // The prompt "Step 3: Update Results Logic" implies this is the new way to show results.
  // But wait, `RefineTaste` button triggers the "Discovery Quiz" (Layer 2).
  // So initially we might want to show the quadrants, OR just show top recommendations based on Palate.
  // The prompt says: "Move away from the symmetric 2x2 grid." This suggests a permanent UI change.

  // I will check if `vibeTags` is present. If NOT, maybe I should still show the quadrants?
  // The user prompt says "Update ResultsScreen... Update UI Layout... Move away from symmetric 2x2 grid".
  // This sounds like a total replacement of the UI.
  // I'll stick to the requested "Hero Card + Runners Up" layout for both states, but maybe with a "Refine" call to action if vibeTags are missing.

  // Wait, if I replace the 2x2 grid, I lose the "Explore the matrix" feel.
  // But the prompt is explicit: "Move away from the symmetric 2x2 grid."

  // Let's implement the Hero + Runners Up.

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
          <p className="text-lg">{whyText}</p>
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
                            Matched based on your preference for {heroDrink.bitter ? "bitter" : "balanced"} and {heroDrink.smoke ? "smoky" : "clean"} flavors,
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
