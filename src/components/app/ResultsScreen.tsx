'use client';
import { useMemo, useEffect, useRef } from 'react';
import { drinkDatabase, type User, type ContextType } from '@/lib/data';
import { calculateDistance, calculateContextScore } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { ConnectBluesky } from './ConnectBluesky';
import { MiniFlavorMap } from './MiniFlavorMap';
import { MenuSection } from './MenuSection';

interface ResultsScreenProps {
    user: User;
    vibeTags?: Record<string, number>;
    onReset: () => void;
}

const MENU_SECTIONS: { context: ContextType; title: string; icon: string; count: number }[] = [
    { context: 'usual',    title: "Your Go-To's",         icon: '🍸', count: 8 },
    { context: 'party',    title: "For a Night Out",      icon: '🎉', count: 6 },
    { context: 'business', title: "Making an Impression", icon: '🤝', count: 6 },
    { context: 'holiday',  title: "Holiday Warmth",       icon: '🎄', count: 6 },
];

export function ResultsScreen({ user, vibeTags, onReset }: ResultsScreenProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    // Stage 1: Filter & Base Score (Biological + Structural)
    const baseScoredDrinks = useMemo(() => {
        const dislikesSmoke = user.filters.includes('noSmoke');
        const dislikesBitter = user.filters.includes('noBitter');
        const dislikesAnise = user.filters.includes('noAnise');

        const availableDrinks = drinkDatabase.filter(d => {
            if (dislikesSmoke && d.hasSmoke) return false;
            if (dislikesBitter && d.isBitter) return false;
            if (dislikesAnise && d.hasAnise) return false;
            return true;
        });

        return availableDrinks.map(drink => {
            const distance = calculateDistance(user, drink);

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
                baseScore,
            };
        });
    }, [user, vibeTags]);

    // Compute all 4 menu sections from base scores
    const sections = useMemo(() => {
        return MENU_SECTIONS.map(({ context, title, icon, count }) => {
            const drinks = baseScoredDrinks.map(drink => ({
                ...drink,
                score: drink.baseScore + calculateContextScore(drink, context),
            })).sort((a, b) => b.score - a.score).slice(0, count);
            return { title, icon, drinks };
        });
    }, [baseScoredDrinks]);

    // Top drinks for the mini map (from "Your Go-To's" section)
    const topDrinks = sections[0].drinks;

    // Hero drink for Bluesky sharing
    const heroDrink = topDrinks[0];

    return (
        <div className="animate-in fade-in duration-500 space-y-6">

            <div className="text-center space-y-2">
                <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-headline text-3xl sm:text-4xl font-bold text-primary outline-none"
                >
                    Your Drink Menu
                </h1>
                <p className="text-muted-foreground italic font-serif text-lg">Curated for your palate.</p>
            </div>

            <MiniFlavorMap user={user} topDrinks={topDrinks} />

            <div className="space-y-8">
                {sections.map(({ title, icon, drinks }) => (
                    <MenuSection
                        key={title}
                        title={title}
                        icon={icon}
                        drinks={drinks}
                        userX={user.x}
                        userY={user.y}
                        userFilters={user.filters}
                    />
                ))}
            </div>

            <ConnectBluesky
                user={user}
                vibeTags={vibeTags || {}}
                heroDrinkName={heroDrink?.name || ''}
                quadrant={user.x <= 0 && user.y >= 0 ? 'Lush & Lively' : user.x > 0 && user.y >= 0 ? 'Crisp & Clean' : user.x <= 0 && user.y < 0 ? 'Decadent & Deep' : 'Bold & Complex'}
            />

            <div className="text-center pt-8 border-t border-primary/10">
                <Button
                    onClick={onReset}
                    variant="ghost"
                    className="text-muted-foreground hover:text-primary tracking-widest uppercase text-xs h-auto min-h-[44px] px-8"
                >
                    Start Over
                </Button>
            </div>
        </div>
    );
}
