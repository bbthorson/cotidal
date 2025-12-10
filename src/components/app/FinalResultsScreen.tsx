'use client';
import { useMemo } from 'react';
import type { User } from '@/app/page';
import { drinkDatabase, type Drink } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GlassFull,
  Glass,
  Bottle,
  ToolsKitchen2,
  Barbell,
  Milk,
  Mug,
  Coffee,
} from 'tabler-icons-react';

interface FinalResultsScreenProps {
  user: User;
  discScore: Record<string, number>;
  onReset: () => void;
}

const calculateDistance = (user: { x: number, y: number }, drink: Drink) => {
  return Math.sqrt(Math.pow(user.x - drink.x, 2) + Math.pow(user.y - drink.y, 2));
};

// A simple, fun mapping from DiSC score to a personality type
const getPersonalityType = (discScore: Record<string, number>): string => {
  const primary = Object.keys(discScore).reduce((a, b) => discScore[a] > discScore[b] ? a : b);
  switch (primary) {
    case 'd': return 'The Commander';
    case 'i': return 'The Influencer';
    case 's': return 'The Supporter';
    case 'c': return 'The Analyst';
    default: return 'The Maverick';
  }
}

const iconMap = [
  GlassFull,
  Glass,
  Bottle,
  ToolsKitchen2,
  Barbell,
  Milk,
  Mug,
  Coffee,
];

export function FinalResultsScreen({ user, discScore, onReset }: FinalResultsScreenProps) {

  const { top8, adjustedUser, personalityType } = useMemo(() => {
    // 1. Calculate the personality type
    const personality = getPersonalityType(discScore);

    // 2. Adjust the user's coordinates based on the DiSC score
    let adjX = user.x;
    let adjY = user.y;

    const d_influence = (discScore.d || 0) * 2.5;
    const i_influence = (discScore.i || 0) * 2.5;
    const s_influence = (discScore.s || 0) * 2.5;
    const c_influence = (discScore.c || 0) * 2.5;

    // D: Rich & Complex (x+, y-)
    adjX += d_influence;
    adjY -= d_influence;
    
    // i: Crisp & Classic (x-, y+)
    adjX -= i_influence;
    adjY += i_influence;

    // S: Rich & Classic (x-, y-)
    adjX -= s_influence;
    adjY -= s_influence;
    
    // C: Crisp & Complex (x+, y+)
    adjX += c_influence;
    adjY += c_influence;

    const adjustedUser = {
      ...user,
      x: Math.max(-10, Math.min(10, adjX)),
      y: Math.max(-10, Math.min(10, adjY)),
    };

    // 3. Find the top 8 drinks
    const availableDrinks = drinkDatabase.filter(d => {
      if (user.filters.includes('noSmoke') && d.smoke) return false;
      if (user.filters.includes('noBitter') && d.bitter) return false;
      return true;
    }).map(drink => ({
      ...drink,
      distance: calculateDistance(adjustedUser, drink),
    })).sort((a, b) => a.distance - b.distance);

    return { top8: availableDrinks.slice(0, 8), adjustedUser, personalityType: personality };
  }, [user, discScore]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <Card className="text-center shadow-2xl border-4 border-primary/20 bg-card p-6">
        <h2 className="font-headline text-2xl text-accent">Your Cocktail Personality Is:</h2>
        <h1 className="font-headline text-5xl font-bold text-primary">{personalityType}</h1>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-center font-bold text-primary">Your Top 8 Drinks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {top8.map((drink, index) => {
              const Icon = iconMap[index];
              return (
                <li key={drink.name} className="border-2 border-dashed border-border p-4 rounded-lg text-center bg-background flex flex-col items-center justify-center">
                  <p className="font-bold text-lg text-accent">#{index + 1}</p>
                  <Icon size={48} className="text-primary my-2" />
                  <p className="font-bold text-primary/90 text-xl">{drink.name}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{drink.type}</p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      
      <div className="text-center mt-8">
        <Button onClick={onReset} variant="outline" size="lg" className="uppercase tracking-wider font-bold border-primary/50 text-primary/80 hover:bg-primary hover:text-primary-foreground">
          Start Over
        </Button>
      </div>
    </div>
  );
}
