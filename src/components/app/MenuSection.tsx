'use client';

import { memo } from 'react';
import { DrinkCard } from './DrinkCard';
import type { Drink } from '@/lib/data';

type ScoredDrink = Drink & { score: number; baseScore: number; distance: number };

interface MenuSectionProps {
    title: string;
    drinks: ScoredDrink[];
    userX: number;
    userY: number;
    userFilters: string[];
    startRank?: number;
}

export const MenuSection = memo(function MenuSection({ title, drinks, userX, userY, userFilters, startRank = 1 }: MenuSectionProps) {
    return (
        <section className="space-y-1">
            <div className="space-y-2">
                <h2 className="font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {title}
                </h2>
                <div className="editorial-rule" />
            </div>
            <div className="divide-y divide-primary/[0.06]">
                {drinks.map((drink, idx) => (
                    <DrinkCard
                        key={drink.name}
                        drink={drink}
                        rank={startRank + idx}
                        userX={userX}
                        userY={userY}
                        userFilters={userFilters}
                    />
                ))}
            </div>
        </section>
    );
});
