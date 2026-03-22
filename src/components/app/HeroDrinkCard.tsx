'use client';

import { memo, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { explainDrinkMatch } from '@/app/actions/explain-drink';
import type { Drink } from '@/lib/data';

const TYPE_STYLES: Record<string, string> = {
  Cocktail: 'bg-primary/15 text-primary',
  Wine: 'bg-rose-500/15 text-rose-400',
  Beer: 'bg-amber-500/15 text-amber-400',
  Spirit: 'bg-yellow-600/15 text-yellow-500',
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
      <p className="font-condensed text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Your Top Pick
      </p>

      <div className="border border-primary/15 rounded-sm p-5 space-y-3 bg-primary/[0.02]">
        {/* Name + type */}
        <div className="flex items-baseline gap-3">
          <h3 className="font-headline text-xl font-bold text-primary">
            {drink.name}
          </h3>
          <span className={`font-condensed text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${typeStyle}`}>
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
