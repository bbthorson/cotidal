'use client';

import { memo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MapBackground } from './MapBackground';
import { MapPin } from './MapPin';
import { UserPin } from './UserPin';
import { toPct } from '@/lib/scoring';
import type { Drink, User } from '@/lib/data';

type ScoredDrink = Drink & { score: number; baseScore: number; distance: number };

interface MiniFlavorMapProps {
    user: User;
    topDrinks: ScoredDrink[];
}

export const MiniFlavorMap = memo(function MiniFlavorMap({ user, topDrinks }: MiniFlavorMapProps) {
    return (
        <div className="relative w-full max-w-sm mx-auto aspect-2/1 border border-primary/10 overflow-hidden pointer-events-none rounded-sm">
            <MapBackground />
            <TooltipProvider>
                {topDrinks.slice(0, 5).map((drink) => (
                    <MapPin
                        key={drink.name}
                        drink={drink}
                        isTopPick={false}
                        isHovered={false}
                        onHover={() => {}}
                        xPct={toPct(drink.x)}
                        yPct={toPct(drink.y)}
                    />
                ))}
                <UserPin
                    x={user.x}
                    y={user.y}
                    xPct={toPct(user.x)}
                    yPct={toPct(user.y)}
                />
            </TooltipProvider>
        </div>
    );
});
