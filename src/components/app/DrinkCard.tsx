import { memo, useState } from 'react';
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

interface DrinkCardProps {
  drink: ScoredDrink;
  rank: number;
  userX: number;
  userY: number;
  userFilters: string[];
}

export const DrinkCard = memo(function DrinkCard({ drink, rank, userX, userY, userFilters }: DrinkCardProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleExpand = async () => {
    setExpanded(prev => !prev);
    if (!explanation && !loading) {
      setLoading(true);
      try {
        const text = await explainDrinkMatch(drink.name, {
          x: userX,
          y: userY,
          dislikesSmoke: userFilters.includes('noSmoke'),
          dislikesBitter: userFilters.includes('noBitter'),
        });
        setExplanation(text);
      } catch {
        setExplanation(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const typeStyle = TYPE_STYLES[drink.type] || TYPE_STYLES.Cocktail;

  return (
    <button
      onClick={handleExpand}
      className="w-full text-left group"
    >
      <div className="py-3 space-y-1.5">
        {/* Top row: rank + name + type badge */}
        <div className="flex items-baseline gap-3">
          <span className="font-condensed text-2xs text-muted-foreground/40 tabular-nums w-4 shrink-0">
            {rank}
          </span>
          <span className="font-headline text-sm font-bold text-primary group-hover:text-primary/80 transition-colors truncate">
            {drink.name}
          </span>
          <span className="ml-auto shrink-0 flex items-center gap-2">
            {drink.score !== undefined && (
              <span className="font-mono text-3xs text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-sm border border-secondary/15 font-bold">
                {Math.round(drink.score)}% Match
              </span>
            )}
            <span className={`font-condensed text-2xs uppercase tracking-wordmark px-2 py-0.5 rounded-sm ${typeStyle}`}>
              {drink.type}
            </span>
          </span>
        </div>

        {/* Tags */}
        <div className="pl-7">
          <p className="text-xs italic text-muted-foreground/50">
            {drink.tags.slice(0, 3).join(' · ')}
          </p>
        </div>

        {/* Expanded: explanation */}
        {expanded && (
          <div className="pl-7 pt-1">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs italic">Thinking…</span>
              </div>
            ) : explanation ? (
              <p className="text-xs text-foreground/70 leading-relaxed">{explanation}</p>
            ) : null}
          </div>
        )}
      </div>
    </button>
  );
});
