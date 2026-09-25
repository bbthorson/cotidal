import { memo } from 'react';
import { getQuadrantName } from '@/lib/scoring';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserPinProps {
  x: number;
  y: number;
  xPct: number;
  yPct: number;
}

export const UserPin = memo(function UserPin({ x, y, xPct, yPct }: UserPinProps) {
  return (
    <Tooltip>
        <TooltipTrigger asChild>
            <button
                type="button"
                aria-label={`Your Palate Profile: ${getQuadrantName(x, y)}`}
                className="absolute w-11 h-11 flex items-center justify-center z-30 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
            >
                <div className="w-6 h-6 bg-primary rounded-full border-2 border-card shadow-xl animate-pulse flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 pointer-events-none"></div>
                </div>
            </button>
        </TooltipTrigger>
        <TooltipContent>
            <p className="font-bold">You are here</p>
            <p className="text-xs text-muted-foreground">{getQuadrantName(x, y)}</p>
        </TooltipContent>
    </Tooltip>
  );
});
