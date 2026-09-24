import { memo, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { explainDrinkMatch } from '@/lib/api-client';
import type { Drink } from '@/lib/data';

const TYPE_STYLES: Record<string, string> = {
  Cocktail: 'bg-primary/15 text-primary',
  Wine: 'bg-primary/20 text-primary',
  Beer: 'bg-secondary/15 text-secondary',
  Spirit: 'bg-accent/30 text-foreground',
};

type ScoredDrink = Drink & { score: number; baseScore: number; distance: number };

interface HeroDrinkCardProps {
  drink: ScoredDrink;
  userX: number;
  userY: number;
  userFilters: string[];
}

export const HeroDrinkCard = memo(function HeroDrinkCard({ drink, userX, userY, userFilters }: HeroDrinkCardProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    explainDrinkMatch(drink.name, {
      x: userX,
      y: userY,
      dislikesSmoke: userFilters.includes('noSmoke'),
      dislikesBitter: userFilters.includes('noBitter'),
    }).then(text => {
      if (!cancelled) {
        setExplanation(text);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [drink.name, userX, userY, userFilters]);

  const typeStyle = TYPE_STYLES[drink.type] || TYPE_STYLES.Cocktail;

  return (
    <div className="space-y-4">
      <p className="label-caps">
        Your Top Pick
      </p>

      <div className="border border-border rounded-sm p-5 space-y-3 bg-card shadow-bar">
        {/* Name + type */}
        <div className="flex items-baseline gap-3 w-full">
          <h3 className="font-headline text-xl font-bold text-primary">
            {drink.name}
          </h3>
          {drink.score !== undefined && (
            <span className="font-mono text-2xs text-secondary bg-secondary/15 px-2 py-0.5 rounded-sm border border-secondary/20 font-bold">
              {Math.round(drink.score)}% Match
            </span>
          )}
          <span className={`font-condensed text-2xs uppercase tracking-wordmark px-2 py-0.5 rounded-sm ml-auto ${typeStyle}`}>
            {drink.type}
          </span>
        </div>

        {/* Tags */}
        <p className="text-xs italic text-muted-foreground/60">
          {drink.tags.join(' · ')}
        </p>

        {/* Auto-loaded explanation */}
        <div className="editorial-rule" />
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground/40 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs italic">Thinking about why this is perfect for you…</span>
          </div>
        ) : explanation ? (
          <p className="text-sm text-foreground/80 leading-relaxed italic">{explanation}</p>
        ) : null}
      </div>
    </div>
  );
});
