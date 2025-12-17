'use client';
import { useMemo, useState, useEffect } from 'react';
import { drinkDatabase, type Drink, type VibeTag, type User, type ContextType } from '@/lib/data';
import { calculateDistance, calculateContextScore } from '@/lib/scoring';
import { fetchDrinkDetails, type CocktailDBResult } from '@/lib/cocktail-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chatbot } from './Chatbot';
import { explainDrinkMatch } from '@/app/actions/explain-drink';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';

interface ResultsScreenProps {
  user: User;
  vibeTags?: Record<string, number>;
  onReset: () => void;
}

const CONTEXTS: Record<ContextType, { label: string; icon: string; description: string }> = {
    usual: { label: "My Usual", icon: "🍸", description: "Your calibrated flavor profile." },
    business: { label: "Business", icon: "🤝", description: "Safe, prestigious, and impressive." },
    party: { label: "Party", icon: "🎉", description: "Fun, social, and easy-drinking." },
    holiday: { label: "Holiday", icon: "🎄", description: "Cozy, warm, and comforting." },
};

export function ResultsScreen({ user, vibeTags, onReset }: ResultsScreenProps) {
  const [context, setContext] = useState<ContextType>("usual");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [hoveredDrink, setHoveredDrink] = useState<Drink | null>(null);

  // State for fetched drink details (images, instructions)
  const [drinkDetails, setDrinkDetails] = useState<Record<string, CocktailDBResult>>({});
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const recommendations = useMemo(() => {
    // 1. Filter by hard constraints (smoke/bitter/anise)
    let availableDrinks = drinkDatabase.filter(d => {
        if(user.filters.includes('noSmoke') && d.hasSmoke) return false;
        if(user.filters.includes('noBitter') && d.isBitter) return false;
        if(user.filters.includes('noAnise') && d.hasAnise) return false;
        return true;
    });

    // 2. Score and Sort based on Distance + Vibe Tags + Context
    const scoredDrinks = availableDrinks.map(drink => {
        const distance = calculateDistance(user, drink);

        // Base Score (Distance + User Vibe Tags)
        let vibeScore = 0;
        if (vibeTags) {
            drink.tags.forEach(tag => {
                if (vibeTags[tag]) vibeScore += vibeTags[tag];
            });
        }

        const baseScore = (1 / (distance + 0.1)) + (vibeScore * 2);

        // Context Score
        const contextScore = calculateContextScore(drink, context);

        return {
            ...drink,
            distance,
            score: baseScore + contextScore,
            isContextMatch: contextScore > 0 // Flag if it matches current context well
        };
    }).sort((a, b) => b.score - a.score);

    return scoredDrinks;
  }, [user, vibeTags, context]);

  // Memoize topPicks to prevent unnecessary re-fetching of details when other state (like hoveredDrink) changes.
  const topPicks = useMemo(() => recommendations.slice(0, 3), [recommendations]);
  const heroDrink = topPicks[0];

  // Fetch drink details for top picks
  useEffect(() => {
      let isMounted = true;

      const fetchDetails = async () => {
          setLoadingDetails(true);

          // Identify which drinks need fetching
          // Note: using drinkDetails from closure is fine as we rely on functional update for the set
          const drinksToFetch = topPicks.filter(drink => !drinkDetails[drink.name]);

          if (drinksToFetch.length === 0) {
              if (isMounted) setLoadingDetails(false);
              return;
          }

          try {
              // ⚡ Bolt Optimization: Parallelize requests using Promise.all
              const results = await Promise.all(
                  drinksToFetch.map(async (drink) => {
                      const data = await fetchDrinkDetails(drink.name);
                      return { name: drink.name, data };
                  })
              );

              if (isMounted) {
                  setDrinkDetails(prev => {
                      const next = { ...prev };
                      let hasUpdates = false;
                      results.forEach(({ name, data }) => {
                          if (data) {
                              next[name] = data;
                              hasUpdates = true;
                          }
                      });
                      return hasUpdates ? next : prev;
                  });
              }
          } catch (error) {
              console.error("Failed to fetch drink details", error);
          } finally {
              if (isMounted) setLoadingDetails(false);
          }
      };

      if (topPicks.length > 0) {
          fetchDetails();
      }

      return () => {
          isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topPicks]); // Only refetch if top picks change (which depends on context/filters)

  const handleExplain = async () => {
      if (!heroDrink) return;
      setLoadingExplanation(true);
      try {
          const text = await explainDrinkMatch(heroDrink.name, {
              x: user.x,
              y: user.y,
              dislikesSmoke: user.filters.includes('noSmoke'),
              dislikesBitter: user.filters.includes('noBitter'),
          });
          setExplanation(text);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingExplanation(false);
      }
  };

  // Convert coordinates to CSS percentages (Range -10 to 10 mapped to 0% to 100%)
  const toPct = (val: number) => ((val + 10) / 20) * 100;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
          <h1 className="font-headline text-3xl font-bold text-primary">The Palate Map</h1>
          <p className="text-muted-foreground">Your personal flavor universe.</p>
      </div>

      {/* Context Switcher */}
      <div className="flex justify-center">
          <Tabs value={context} onValueChange={(v) => { setContext(v as ContextType); setExplanation(null); }} className="w-full max-w-md">
            <TabsList className="grid grid-cols-4 bg-primary/5">
                {Object.entries(CONTEXTS).map(([key, { label, icon }]) => (
                    <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                        <span className="mr-1">{icon}</span>
                        <span className="hidden sm:inline">{label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
          </Tabs>
      </div>

      {/* The Visual Map */}
      <Card className="relative w-full aspect-square max-w-lg mx-auto bg-[#FDFBF7] shadow-inner border-2 border-primary/10 overflow-hidden">
        {/* Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="border-r border-b border-primary/10 flex items-start justify-start p-2"><span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Lush & Lively</span></div>
            <div className="border-b border-primary/10 flex items-start justify-end p-2"><span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Crisp & Clean</span></div>
            <div className="border-r border-primary/10 flex items-end justify-start p-2"><span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Decadent & Deep</span></div>
            <div className="flex items-end justify-end p-2"><span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Bold & Complex</span></div>
        </div>

        {/* Axis Labels */}
        <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-bold text-primary/30 -rotate-90">RICH</div>
        <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-bold text-primary/30 rotate-90">CRISP</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary/30">COMPLEX / SAVORY</div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary/30">SWEET / FRUITY</div>

        {/* Render Drinks as Pins */}
        <TooltipProvider>
            {recommendations.slice(0, 15).map((drink, i) => { // Show top 15 matches to avoid clutter
                const isTopPick = i < 3;
                return (
                    <Tooltip key={drink.name}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Select ${drink.name}, ${drink.type}`}
                                className={cn(
                                    "absolute w-3 h-3 rounded-full transition-all duration-300 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 p-0 border-none",
                                    isTopPick ? "bg-primary w-4 h-4 z-20 shadow-lg" : "bg-primary/30 hover:bg-primary/60 z-10",
                                    hoveredDrink?.name === drink.name && "scale-150 bg-primary ring-2 ring-white",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                                )}
                                style={{ left: `${toPct(drink.x)}%`, bottom: `${toPct(drink.y)}%` }} // Data Y is positive up, CSS bottom aligns with that
                                onMouseEnter={() => setHoveredDrink(drink)}
                                onMouseLeave={() => setHoveredDrink(null)}
                                onFocus={() => setHoveredDrink(drink)}
                                onBlur={() => setHoveredDrink(null)}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-bold">{drink.name}</p>
                            <p className="text-xs text-muted-foreground">{drink.type}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </TooltipProvider>

        {/* User Dot */}
        <div
            className="absolute w-6 h-6 bg-[#B7410E] rounded-full border-2 border-white shadow-xl z-30 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{ left: `${toPct(user.x)}%`, bottom: `${toPct(user.y)}%` }}
        >
             <div className="absolute inset-0 rounded-full bg-[#B7410E] animate-ping opacity-20"></div>
        </div>

      </Card>

      {/* Unlock UI - Top Picks */}
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-bold text-center text-primary">
            {context === 'usual' ? 'Your Top Matches' : `Best for ${CONTEXTS[context].label}`}
        </h2>

        <div className="grid grid-cols-1 gap-4">
            {topPicks.map((drink, index) => {
                const details = drinkDetails[drink.name];
                return (
                    <Card
                        key={drink.name}
                        className={cn(
                            "transition-all duration-300 border-2 cursor-pointer overflow-hidden",
                            index === 0 ? "border-[#B7410E] bg-[#FDFBF7] shadow-mcm" : "border-transparent bg-card/50 hover:bg-card hover:border-primary/20",
                            hoveredDrink?.name === drink.name && "ring-2 ring-primary"
                        )}
                        onMouseEnter={() => setHoveredDrink(drink)}
                        onMouseLeave={() => setHoveredDrink(null)}
                    >
                        <div className="flex flex-col sm:flex-row">
                             {/* Image Section */}
                             <div className={cn(
                                 "relative shrink-0 overflow-hidden",
                                 index === 0 ? "h-48 sm:h-auto sm:w-1/3" : "h-0 sm:h-auto sm:w-0" // Hide image for non-hero items initially to save space, or maybe show small? Let's just show hero image prominently.
                             )}>
                                 {index === 0 && (
                                     details ? (
                                         // eslint-disable-next-line @next/next/no-img-element
                                         <img src={details.strDrinkThumb} alt={drink.name} className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/30">
                                             {loadingDetails ? <Skeleton className="w-full h-full" /> : "No Image"}
                                         </div>
                                     )
                                 )}
                             </div>

                             <div className="flex-1 p-0">
                                <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-primary">{drink.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground">{drink.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {drink.tags.slice(0, 2).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-[10px] uppercase">{tag}</Badge>
                                        ))}
                                    </div>
                                </CardHeader>

                                {index === 0 && (
                                    <CardContent className="pt-0 pb-4 space-y-3">
                                        {/* Recipe/Instructions from API if available */}
                                        {details && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                                &quot;{details.strInstructions}&quot;
                                            </p>
                                        )}

                                         <p className="text-sm text-muted-foreground">
                                            {explanation || (
                                                <span>
                                                    Perfectly balanced for your palate coordinates [{user.x}, {user.y}].
                                                    {context !== 'usual' && ` Selected specifically for the ${CONTEXTS[context].label} vibe.`}
                                                </span>
                                            )}
                                         </p>
                                         {!explanation && (
                                            <Button
                                                onClick={handleExplain}
                                                disabled={loadingExplanation}
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-primary/20 text-primary hover:bg-primary/5"
                                            >
                                                {loadingExplanation ? "Sommelier is thinking..." : "Why this drink?"}
                                            </Button>
                                         )}
                                    </CardContent>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
      </div>

      <Chatbot />

      <div className="text-center pt-8 border-t border-primary/10">
        <Button onClick={onReset} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          Recalibrate Palate (Reset)
        </Button>
      </div>
    </div>
  );
}
