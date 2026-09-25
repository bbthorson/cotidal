import { memo } from 'react';
import { quadrantFor } from '@/lib/quadrant';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UserPinProps {
  x: number;
  y: number;
  xPct: number;
  yPct: number;
}

/**
 * Your dot on the paper map: 14px terracotta, a 2px sheet ring and an ink
 * crosshair — the same mark as the coupe figure. No ping, no pulse.
 */
export const UserPin = memo(function UserPin({ x, y, xPct, yPct }: UserPinProps) {
  const region = quadrantFor(x, y).name;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Your coordinate, in ${region}`}
          className="absolute z-30 flex h-11 w-11 -translate-x-1/2 translate-y-1/2 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
        >
          <span aria-hidden="true" className="absolute h-px w-11 bg-foreground" />
          <span aria-hidden="true" className="absolute h-11 w-px bg-foreground" />
          <span aria-hidden="true" className="relative h-3.5 w-3.5 rounded-full border-2 border-card bg-primary" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-bold">You are here</p>
        <p className="text-xs text-muted-foreground">{region}</p>
      </TooltipContent>
    </Tooltip>
  );
});
