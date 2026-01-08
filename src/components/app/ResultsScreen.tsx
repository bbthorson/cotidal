'use client';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { drinkDatabase, type Drink, type User, type ContextType } from '@/lib/data';
import { calculateDistance, calculateContextScore, toPct } from '@/lib/scoring';
import { fetchDrinkDetails, type CocktailDBResult } from '@/lib/cocktail-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chatbot } from './Chatbot';
import { explainDrinkMatch } from '@/app/actions/explain-drink';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MapPin } from './MapPin';
import { UserPin } from './UserPin';
import { DrinkCard } from './DrinkCard';

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

// Optimization: Pre-calculate CONTEXT entries to avoid re-creating the array on every render
const CONTEXT_OPTIONS = Object.entries(CONTEXTS) as [string, { label: string; icon: string; description: string }][];

export function ResultsScreen({ user, vibeTags, onReset }: ResultsScreenProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const [context, setContext] = useState<ContextType>("usual");
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [hoveredDrink, setHoveredDrink] = useState<Drink | null>(null);

    // State for fetched drink details (images, instructions)
    const [drinkDetails, setDrinkDetails] = useState<Record<string, CocktailDBResult>>({});
    const [, setLoadingDetails] = useState<boolean>(false);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    // Optimization: Split scoring into two stages to prevent full recalculation on context switch.

    // Stage 1: Filter & Base Score (Biological + Structural)
    // Depends only on User Profile (User + Vibe Tags), not the UI Context tab.
    const baseScoredDrinks = useMemo(() => {
        // Optimization: Extract filter checks to avoid repeated array lookups in loop
        const dislikesSmoke = user.filters.includes('noSmoke');
        const dislikesBitter = user.filters.includes('noBitter');
        const dislikesAnise = user.filters.includes('noAnise');

        // 1. Filter by hard constraints (smoke/bitter/anise)
        const availableDrinks = drinkDatabase.filter(d => {
            if (dislikesSmoke && d.hasSmoke) return false;
            if (dislikesBitter && d.isBitter) return false;
            if (dislikesAnise && d.hasAnise) return false;
            return true;
        });

        // 2. Calculate Distance & Vibe Score
        return availableDrinks.map(drink => {
            const distance = calculateDistance(user, drink);

            // Base Score (Distance + User Vibe Tags)
            let vibeScore = 0;
            if (vibeTags) {
                drink.tags.forEach(tag => {
                    if (vibeTags[tag]) vibeScore += vibeTags[tag];
                });
            }

            const baseScore = (1 / (distance + 0.1)) + (vibeScore * 2);

            return {
                ...drink,
                distance,
                baseScore
            };
        });
    }, [user, vibeTags]);

    // Stage 2: Context Score & Sort
    // Cheap operation that runs when switching tabs (Context).
    // Depends on [baseScoredDrinks, context].
    const recommendations = useMemo(() => {
        return baseScoredDrinks.map(drink => {
            const contextScore = calculateContextScore(drink, context);

            return {
                ...drink,
                score: drink.baseScore + contextScore,
                isContextMatch: contextScore > 0 // Flag if it matches current context well
            };
        }).sort((a, b) => b.score - a.score);

    }, [baseScoredDrinks, context]);

    // Optimization: Memoize visible drinks to prevent array reallocation during hover events (which cause re-renders)
    const visibleDrinks = useMemo(() => recommendations.slice(0, 15), [recommendations]);

    // Memoize topPicks to prevent unnecessary re-fetching of details when other state (like hoveredDrink) changes.
    const topPicks = useMemo(() => recommendations.slice(0, 3), [recommendations]);
    const heroDrink = topPicks[0];

    // Fetch drink details for top picks
    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            // Identify missing details to fetch
            const drinksToFetch = topPicks.filter(drink => !drinkDetails[drink.name]);

            if (drinksToFetch.length === 0) {
                // Optimization: Avoid setting loading state if data is already cached
                if (isMounted) setLoadingDetails(false);
                return;
            }

            setLoadingDetails(true);

            // Fetch in parallel to avoid waterfalls
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
                setLoadingDetails(false);
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

    // Optimization: useCallback prevents recreating this function on every render,
    // allowing DrinkCard(index=0) to skip re-rendering when hovering other cards.
    const handleExplain = useCallback(async () => {
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
    }, [heroDrink, user.x, user.y, user.filters]);

    return (
        <div className="animate-in fade-in duration-500 space-y-6">

            <div className="text-center space-y-2">
                <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-headline text-3xl sm:text-4xl font-bold text-primary outline-none"
                >
                    The Palate Revelation
                </h1>
                <p className="text-muted-foreground italic font-serif text-lg">Your personal flavor universe, unveiled.</p>
            </div>

            {/* Context Switcher */}
            <div className="flex justify-center">
                <Tabs value={context} onValueChange={(v) => { setContext(v as ContextType); setExplanation(null); }} className="w-full max-w-md">
                    <TabsList className="grid grid-cols-4 bg-primary/5" aria-label="Filter recommendations by context">
                        {CONTEXT_OPTIONS.map(([key, { label, icon }]) => (
                            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm" aria-label={label}>
                                <span className="mr-1" aria-hidden="true">{icon}</span>
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

                {/* Render Drinks as Pins & User Dot */}
                <TooltipProvider>
                    {visibleDrinks.map((drink, i) => { // Use memoized visibleDrinks
                        const isTopPick = i < 3;
                        return (
                            <MapPin
                                key={drink.name}
                                drink={drink}
                                isTopPick={isTopPick}
                                isHovered={hoveredDrink?.name === drink.name}
                                onHover={setHoveredDrink}
                                xPct={toPct(drink.x)}
                                yPct={toPct(drink.y)}
                            />
                        );
                    })}

                    {/* Optimization: Extracted User Dot to memoized component to prevent re-render on hover */}
                    <UserPin
                        x={user.x}
                        y={user.y}
                        xPct={toPct(user.x)}
                        yPct={toPct(user.y)}
                    />
                </TooltipProvider>

            </Card>

            {/* Unlock UI - Top Picks */}
            <div className="space-y-4">
                <h2 className="font-headline text-2xl font-bold text-center text-primary">
                    {context === 'usual' ? 'Your Top Matches' : `Best for ${CONTEXTS[context].label}`}
                </h2>

                <div className="grid grid-cols-1 gap-4" role="list">
                    {topPicks.map((drink, index) => {
                        const details = drinkDetails[drink.name];
                        return (
                            <DrinkCard
                                key={drink.name}
                                drink={drink}
                                index={index}
                                isHovered={hoveredDrink?.name === drink.name}
                                onHover={setHoveredDrink}
                                details={details}
                                explanation={explanation}
                                loadingExplanation={loadingExplanation}
                                onExplain={index === 0 ? handleExplain : undefined}
                                context={context}
                                userX={user.x}
                                userY={user.y}
                                contextLabel={CONTEXTS[context].label}
                            />
                        );
                    })}
                </div>
            </div>

            <Chatbot />

            <div className="text-center pt-8 border-t border-primary/10">
                <Button onClick={onReset} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary tracking-widest uppercase text-xs">
                    Return to the Oracle (Reset)
                </Button>
            </div>
        </div>
    );
}
