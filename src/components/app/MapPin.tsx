import { memo } from 'react';
import { Drink } from '@/lib/data';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MapPinProps {
  drink: Drink;
  isTopPick: boolean;
  isHovered: boolean;
  onHover: (drink: Drink | null) => void;
  xPct: number;
  yPct: number;
}

export const MapPin = memo(function MapPin({
  drink,
  isTopPick,
  isHovered,
  onHover,
  xPct,
  yPct
}: MapPinProps) {
  return (
    <Tooltip>
        <TooltipTrigger asChild>
            <button
                type="button"
                aria-label={`Select ${drink.name}, ${drink.type}`}
                className={cn(
                    "absolute w-3 h-3 rounded-full transition-all duration-300 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 p-0 border-none",
                    isTopPick ? "bg-primary w-4 h-4 z-20 shadow-lg" : "bg-primary/30 hover:bg-primary/60 z-10",
                    isHovered && "scale-150 bg-primary ring-2 ring-white",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                )}
                style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
                onMouseEnter={() => onHover(drink)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(drink)}
                onBlur={() => onHover(null)}
            />
        </TooltipTrigger>
        <TooltipContent>
            <p className="font-bold">{drink.name}</p>
            <p className="text-xs text-muted-foreground">{drink.type}</p>
        </TooltipContent>
    </Tooltip>
  );
});
