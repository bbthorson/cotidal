'use client';
import { useMemo } from 'react';
import type { User } from '@/app/page';
import { drinkDatabase, type Drink } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chatbot } from './Chatbot';
import { RefineTaste } from './RefineTaste';

interface ResultsScreenProps {
  user: User;
  onReset: () => void;
  onRefineTaste: () => void;
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

export function ResultsScreen({ user, onReset, onRefineTaste }: ResultsScreenProps) {
  const leftPercent = ((user.x + 10) / 20) * 100;
  const topPercent = ((10 - user.y) / 20) * 100;

  const xLabel = user.x < 0 ? "Classic" : "Complex";
  const yLabel = user.y > 0 ? "Crisp" : "Rich";
  const profile = `${yLabel} & ${xLabel}`;

  const whyText = `Your answers placed you at coordinates [${user.x}, ${user.y}]. This suggests that you generally enjoy drinks that are ${yLabel.toLowerCase()} and ${xLabel.toLowerCase()}. Use the matrix below to explore drinks that match your unique flavor profile!`

  const quadrants = useMemo(() => {
    const availableDrinks = drinkDatabase.filter(d => {
        if(user.filters.includes('noSmoke') && d.smoke) return false;
        if(user.filters.includes('noBitter') && d.bitter) return false;
        return true;
    }).map(drink => ({
        ...drink,
        distance: calculateDistance(user, drink),
    })).sort((a, b) => a.distance - b.distance);

    const drinksInQuadrants = {
      tl: availableDrinks.filter(d => d.x <= 0 && d.y > 0).slice(0, 4),
      tr: availableDrinks.filter(d => d.x > 0 && d.y > 0).slice(0, 4),
      bl: availableDrinks.filter(d => d.x <= 0 && d.y <= 0).slice(0, 4),
      br: availableDrinks.filter(d => d.x > 0 && d.y <= 0).slice(0, 4),
    };
    
    return drinksInQuadrants;
  }, [user]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(quadrants).map(([key, drinks]) => (
          <Card key={key} className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-accent">{quadrantDetails[key as keyof typeof quadrantDetails].title}</CardTitle>
              <p className="text-muted-foreground">{quadrantDetails[key as keyof typeof quadrantDetails].description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {drinks.map(drink => (
                  <li key={drink.name} className="border-b border-dashed border-border pb-2 last:border-none">
                    <span className="font-bold text-primary/90 block">{drink.name}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{drink.type}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <RefineTaste onStart={onRefineTaste} />

      <Chatbot />
      
      <div className="text-center mt-8">
        <Button onClick={onReset} variant="outline" size="lg" className="uppercase tracking-wider font-bold border-primary/50 text-primary/80 hover:bg-primary hover:text-primary-foreground">
          Retake the Quiz
        </Button>
      </div>
    </div>
  );
}
