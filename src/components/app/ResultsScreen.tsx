'use client';
import { useMemo } from 'react';
import { drinkDatabase, type User, type ContextType } from '@/lib/data';
import { calculateDistance, calculateContextScore } from '@/lib/scoring';
import { ConnectBluesky } from './ConnectBluesky';
import { MiniFlavorMap } from './MiniFlavorMap';
import { HeroDrinkCard } from './HeroDrinkCard';
import { MenuSection } from './MenuSection';
import { DrinkLogForm } from './DrinkLogForm';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

interface ResultsScreenProps {
    user: User;
    vibeTags?: Record<string, number>;
    onPalateUpdated?: (profile: UserProfile) => void;
}

const MENU_SECTIONS: { context: ContextType; title: string; count: number }[] = [
    { context: 'usual',    title: "Your Go-To's",         count: 8 },
    { context: 'party',    title: "For a Night Out",      count: 6 },
    { context: 'business', title: "Making an Impression", count: 6 },
    { context: 'holiday',  title: "Holiday Warmth",       count: 6 },
];

export function ResultsScreen({ user, vibeTags, onPalateUpdated }: ResultsScreenProps) {
    // Stage 1: Filter & Base Score
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

    const sections = useMemo(() => {
        return MENU_SECTIONS.map(({ context, title, count }) => {
            const drinks = baseScoredDrinks.map(drink => ({
                ...drink,
                score: drink.baseScore + calculateContextScore(drink, context),
            })).sort((a, b) => b.score - a.score).slice(0, count);
            return { title, drinks };
        });
    }, [baseScoredDrinks]);

    const topDrinks = sections[0].drinks;
    const heroDrink = topDrinks[0];
    const restOfTopDrinks = topDrinks.slice(1);

    return (
        <div className="animate-in fade-in duration-500 px-5 py-6 space-y-10">
            {/* Hero section */}
            <div className="space-y-6">
                <p className="text-center text-muted-foreground/60 italic font-serif text-base">
                    Curated for your palate.
                </p>

                <MiniFlavorMap user={user} topDrinks={topDrinks} />

                {heroDrink && (
                    <HeroDrinkCard
                        drink={heroDrink}
                        userX={user.x}
                        userY={user.y}
                        userFilters={user.filters}
                    />
                )}
            </div>

            {/* Rest of Go-To's */}
            {restOfTopDrinks.length > 0 && (
                <MenuSection
                    title={sections[0].title}
                    drinks={restOfTopDrinks}
                    userX={user.x}
                    userY={user.y}
                    userFilters={user.filters}
                    startRank={2}
                />
            )}

            {/* Other context sections */}
            {sections.slice(1).map(({ title, drinks }) => (
                <MenuSection
                    key={title}
                    title={title}
                    drinks={drinks}
                    userX={user.x}
                    userY={user.y}
                    userFilters={user.filters}
                />
            ))}

            <ConnectBluesky
                user={user}
                vibeTags={vibeTags || {}}
                heroDrinkName={heroDrink?.name || ''}
                quadrant={user.x <= 0 && user.y >= 0 ? 'Lush & Lively' : user.x > 0 && user.y >= 0 ? 'Crisp & Clean' : user.x <= 0 && user.y < 0 ? 'Decadent & Deep' : 'Bold & Complex'}
            />

            <DrinkLogForm
                recommendedDrinks={topDrinks.map(d => d.name)}
                onPalateUpdated={(profile) => {
                    if (onPalateUpdated) {
                        onPalateUpdated(profile);
                    }
                }}
            />
        </div>
    );
}
