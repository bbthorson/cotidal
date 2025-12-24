import { memo } from 'react';
import { Drink, ContextType } from '@/lib/data';
import { CocktailDBResult } from '@/lib/cocktail-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DrinkCardProps {
  drink: Drink;
  index: number;
  isHovered: boolean;
  onHover: (drink: Drink | null) => void;
  details?: CocktailDBResult;
  explanation?: string | null;
  loadingExplanation?: boolean;
  onExplain?: () => void;
  context: ContextType;
  userX: number;
  userY: number;
  contextLabel: string;
}

export const DrinkCard = memo(function DrinkCard({
  drink,
  index,
  isHovered,
  onHover,
  details,
  explanation,
  loadingExplanation,
  onExplain,
  context,
  userX,
  userY,
  contextLabel
}: DrinkCardProps) {
  return (
    <Card
      role="listitem"
      tabIndex={0}
      aria-label={`View details for ${drink.name}`}
      className={cn(
        "transition-all duration-300 border-2 cursor-pointer overflow-hidden focus-visible:outline-none",
        index === 0 ? "border-[#B7410E] bg-[#FDFBF7] shadow-mcm" : "border-transparent bg-card/50 hover:bg-card hover:border-primary/20",
        isHovered && "ring-2 ring-primary"
      )}
      onMouseEnter={() => onHover(drink)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(drink)}
      onBlur={() => onHover(null)}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <div className={cn(
          "relative shrink-0 overflow-hidden",
          index === 0 ? "h-48 sm:h-auto sm:w-1/3" : "h-0 sm:h-auto sm:w-0"
        )}>
          {index === 0 && (
            details ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={details.strDrinkThumb} alt={drink.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/30">
                <Skeleton className="w-full h-full" />
              </div>
            )
          )}
        </div>

        <div className="flex-1 p-0">
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                {index + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary leading-none tracking-tight">{drink.name}</h3>
                <p className="text-xs text-muted-foreground">{drink.type}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {drink.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] uppercase">{tag}</Badge>
              ))}
            </div>
          </CardHeader>

          {index === 0 && (
            <CardContent className="pt-0 pb-4 space-y-3">
              {/* Recipe/Instructions from API if available */}
              {details && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  &quot;{details.strInstructions}&quot;
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                {explanation || (
                  <span>
                    Perfectly balanced for your palate coordinates [{userX}, {userY}].
                    {context !== 'usual' && ` Selected specifically for the ${contextLabel} vibe.`}
                  </span>
                )}
              </p>
              {!explanation && onExplain && (
                <Button
                  onClick={onExplain}
                  disabled={loadingExplanation}
                  variant="outline"
                  size="sm"
                  className="w-full border-primary/20 text-primary hover:bg-primary/5"
                >
                  {loadingExplanation ? "Sommelier is thinking..." : "Why this drink?"}
                </Button>
              )}
            </CardContent>
          )}
        </div>
      </div>
    </Card>
  );
});
