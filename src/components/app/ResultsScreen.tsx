'use client';
import { useMemo } from 'react';
import type { User } from '@/app/page';
import { drinkDatabase, type Drink } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chatbot } from './Chatbot';

interface ResultsScreenProps {
  user: User;
  onReset: () => void;
}

const quadrantDetails = {
  tl: { id: "list-tl", title: "The Lush & Lively", filter: (d: Drink) => d.x <= 0 && d.y > 0 },
  tr: { id: "list-tr", title: "The Crisp & Clean", filter: (d: Drink) => d.x > 0 && d.y > 0 },
  bl: { id: "list-bl", title: "The Decadent & Deep", filter: (d: Drink) => d.x <= 0 && d.y <= 0 },
  br: { id: "list-br", title: "The Bold & Complex", filter: (d: Drink) => d.x > 0 && d.y <= 0 },
}

const calculateDistance = (user: User, drink: Drink) => {
    return Math.sqrt(Math.pow(user.x - drink.x, 2) + Math.pow(user.y - drink.y, 2));
};

export function ResultsScreen({ user, onReset }: ResultsScreenProps) {
  const leftPercent = ((user.x + 10) / 20) * 100;
  const topPercent = ((10 - user.y) / 20) * 100;
  
  const xLabel = user.x < 0 ? "Sweet & Fruity" : "Savory & Dry";
  const yLabel = user.y > 0 ? "Crisp & Refreshing" : "Rich & Complex";
  const profile = `${yLabel} & ${xLabel}`;

  const whyText = `Your answers placed you at coordinates [${user.x}, ${user.y}]. ${user.x > 0 ? "You gravitate towards savory, botanical, or bitter notes rather than overt sugar. " : "You prefer approachable sweetness and fruit-forward profiles over bitterness. "}${user.y > 0 ? "Texture-wise, you value effervescence and acidity." : "Texture-wise, you enjoy weight on the palate and lingering finishes."}`;

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
      tl: availableDrinks.filter(quadrantDetails.tl.filter).slice(0, 4),
      tr: availableDrinks.filter(quadrantDetails.tr.filter).slice(0, 4),
      bl: availableDrinks.filter(quadrantDetails.bl.filter).slice(0, 4),
      br: availableDrinks.filter(quadrantDetails.br.filter).slice(0, 4),
    }
    
    return drinksInQuadrants;
  }, [user]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <Card className="text-center shadow-xl border-2 border-primary/5 bg-card p-6">
        <h1 className="font-headline text-4xl font-bold text-primary">Your Palate Matrix</h1>
        <p className="text-muted-foreground mt-2">We've analyzed your inputs.</p>
        <div className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full text-lg font-bold mt-4">
          {profile}
        </div>
      </Card>

      <div className="relative mx-auto max-w-4xl" style={{ padding: '40px 50px' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-widest text-muted-foreground hidden md:block">Crisp & Refreshing</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-widest text-muted-foreground hidden md:block">Rich & Spirit-Forward</div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold uppercase tracking-widest text-muted-foreground hidden md:block">Sweet & Fruity</div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-sm font-bold uppercase tracking-widest text-muted-foreground hidden md:block">Savory, Dry & Bitter</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative bg-border rounded-lg shadow-lg p-1">
            <div 
              className="absolute w-5 h-5 bg-primary rounded-full border-2 border-primary-foreground shadow-2xl z-10 hidden md:block"
              style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: 'translate(-50%, -50%)', transition: 'all 1s ease-out' }}
              title={`Your position: (X: ${user.x}, Y: ${user.y})`}
            />

          {Object.entries(quadrants).map(([key, drinks]) => (
            <div key={key} className="bg-card p-4 md:p-6 min-h-[200px] first:rounded-tl-md first:md:rounded-bl-none second:rounded-tr-md last:rounded-br-md last:md:rounded-tr-none md:[&:nth-child(3)]:rounded-bl-md">
              <h3 className="font-headline font-bold text-lg text-accent border-b-2 border-accent/20 pb-2 mb-4">
                {quadrantDetails[key as keyof typeof quadrantDetails].title}
              </h3>
              <ul className="space-y-3">
                {drinks.map(drink => (
                  <li key={drink.name} className="border-b border-dashed border-border pb-2 last:border-none">
                    <span className="font-bold text-primary/90 block">{drink.name}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{drink.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Card className="bg-accent/90 text-accent-foreground shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline font-bold text-xl">Why this profile?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{whyText}</p>
        </CardContent>
      </Card>
      
      <Chatbot />
      
      <div className="text-center mt-8">
        <Button onClick={onReset} variant="outline" size="lg" className="uppercase tracking-wider font-bold border-primary/50 text-primary/80 hover:bg-primary hover:text-primary-foreground">
          Reset Compass
        </Button>
      </div>
    </div>
  );
}
