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
                    // Positioning and Layout (Hit Area) - 44px standard for mobile
                    "absolute w-11 h-11 rounded-full transform -translate-x-1/2 -translate-y-1/2 p-0 border-none flex items-center justify-center group",
                    // Interaction
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-transform",
                    // Z-Index
                    isTopPick ? "z-20" : "z-10"
                )}
                style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
                onMouseEnter={() => onHover(drink)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(drink)}
                onBlur={() => onHover(null)}
            >
                <span
                    className={cn(
                        // Visual Dot
                        "block rounded-full transition-all duration-300 pointer-events-none",
                        isTopPick ? "w-4 h-4 bg-primary shadow-lg" : "w-3 h-3 bg-primary/30 group-hover:bg-primary/60",
                        // Hover/Active Effects (Driven by parent state or group-hover)
                        isHovered && "scale-150 bg-primary ring-2 ring-white"
                    )}
                />
            </button>
        </TooltipTrigger>
        <TooltipContent>
            <p className="font-bold">{drink.name}</p>
            <p className="text-xs text-muted-foreground">{drink.type}</p>
        </TooltipContent>
    </Tooltip>
  );
});
