import { memo } from 'react';
import { quadrants } from '@/lib/copy';
import type { QuadrantId } from '@/lib/quadrant';
import { cn } from '@/lib/utils';

const CORNER: Record<QuadrantId, string> = {
  vault: 'items-start justify-start',
  orchard: 'items-start justify-end',
  ember: 'items-end justify-start',
  'salt-line': 'items-end justify-end',
};

/**
 * The paper map's ground for the 2:1 strip: tan hairlines, the four regions
 * in Barlow caps, and the axis words on the axes at full strength (design
 * system, 06). The region you are in is set in terracotta 700.
 */
export const MapBackground = memo(function MapBackground({ highlight }: { highlight?: QuadrantId }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
        {quadrants.map((q, i) => (
          <div
            key={q.id}
            className={cn('flex p-2', CORNER[q.id], i % 2 === 0 && 'border-r', i < 2 && 'border-b', 'border-border')}
          >
            <span
              className={cn(
                'font-condensed text-xs uppercase tracking-label',
                q.id === highlight ? 'font-bold text-primary' : 'font-semibold text-muted-foreground'
              )}
            >
              {q.name}
            </span>
          </div>
        ))}
      </div>
    </>
  );
});
