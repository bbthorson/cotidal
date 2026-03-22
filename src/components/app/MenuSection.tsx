'use client';

import { memo } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { MenuItem } from './MenuItem';
import type { Drink } from '@/lib/data';

type ScoredDrink = Drink & { score: number; baseScore: number; distance: number };

interface MenuSectionProps {
    title: string;
    icon: string;
    drinks: ScoredDrink[];
    userX: number;
    userY: number;
    userFilters: string[];
}

export const MenuSection = memo(function MenuSection({ title, icon, drinks, userX, userY, userFilters }: MenuSectionProps) {
    return (
        <section className="space-y-1">
            <div className="flex items-center gap-2 px-1 pb-2 border-b border-primary/20">
                <span aria-hidden="true">{icon}</span>
                <h2 className="font-headline text-lg font-bold text-primary uppercase tracking-wide">
                    {title}
                </h2>
            </div>
            <Accordion type="single" collapsible>
                {drinks.map(drink => (
                    <MenuItem
                        key={drink.name}
                        drink={drink}
                        userX={userX}
                        userY={userY}
                        userFilters={userFilters}
                    />
                ))}
            </Accordion>
        </section>
    );
});
