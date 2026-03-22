'use client';

import { memo } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { MenuItem } from './MenuItem';
import type { Drink } from '@/lib/data';

type ScoredDrink = Drink & { score: number; baseScore: number; distance: number };

interface MenuSectionProps {
    title: string;
    drinks: ScoredDrink[];
    userX: number;
    userY: number;
    userFilters: string[];
}

export const MenuSection = memo(function MenuSection({ title, drinks, userX, userY, userFilters }: MenuSectionProps) {
    return (
        <section className="space-y-3">
            <div className="space-y-2">
                <h2 className="font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {title}
                </h2>
                <div className="editorial-rule" />
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
