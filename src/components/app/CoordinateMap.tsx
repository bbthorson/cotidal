import type { ReactNode } from 'react';
import { quadrants } from '@/lib/copy';
import { quadrantIdFor, type QuadrantId } from '@/lib/quadrant';
import { toPercent } from '@/lib/coordinate';
import { cn } from '@/lib/utils';

/**
 * The map and the coordinate, drawn to the design system (06):
 * sweet top, savory bottom; rich left, crisp right. Vault top-left, Orchard
 * top-right, Ember bottom-left, Salt Line bottom-right.
 *
 * Two tones. `paper` is the instrument; `ink` is the reveal ground, used only
 * when the product reveals something (the coordinate landing, or moving).
 */

export type MapTone = 'paper' | 'ink';

const CORNER: Record<QuadrantId, string> = {
  vault: 'left-2 top-2',
  orchard: 'right-2 top-2',
  ember: 'left-2 bottom-2',
  'salt-line': 'right-2 bottom-2',
};

/** Places a child's centre on a coordinate. */
function at(x: number, y: number) {
  return { left: `${toPercent(x)}%`, bottom: `${toPercent(y)}%` };
}

interface CoordinateMapProps {
  tone?: MapTone;
  /** The user's coordinate: their region's label is set in full strength. */
  you?: { x: number; y: number };
  /** Axis words on the axes (Rich, Crisp, Sweet, Savory). */
  showAxes?: boolean;
  className?: string;
  children?: ReactNode;
}

export function CoordinateMap({ tone = 'paper', you, showAxes = false, className, children }: CoordinateMapProps) {
  const ink = tone === 'ink';
  const yours = you ? quadrantIdFor(you.x, you.y) : null;

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden border',
        ink ? 'border-reveal-muted/50' : 'border-foreground bg-card',
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn('absolute bottom-0 left-1/2 top-0 w-px', ink ? 'bg-reveal-muted/30' : 'bg-border')}
      />
      <div
        aria-hidden="true"
        className={cn('absolute left-0 right-0 top-1/2 h-px', ink ? 'bg-reveal-muted/30' : 'bg-border')}
      />

      {quadrants.map((q) => (
        <span
          key={q.id}
          className={cn(
            // Laid on the ground colour so a drink under a label cannot cut it.
            'absolute z-10 px-0.5 font-condensed text-xs uppercase tracking-label',
            ink ? 'bg-reveal' : 'bg-card',
            CORNER[q.id],
            q.id === yours
              ? cn('font-bold', ink ? 'text-reveal-foreground' : 'text-primary')
              : cn('font-semibold', ink ? 'text-reveal-muted' : 'text-muted-foreground')
          )}
        >
          {q.name}
        </span>
      ))}

      {showAxes && (
        <div aria-hidden="true" className={cn('font-condensed text-2xs tracking-label', ink ? 'text-reveal-muted' : 'text-muted-foreground')}>
          <span className="absolute left-1.5 top-1/2 -translate-y-full pb-1">RICH</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-full pb-1">CRISP</span>
          <span className="absolute left-1/2 top-1.5 pl-2">SWEET</span>
          <span className="absolute bottom-1.5 left-1/2 pl-2">SAVORY</span>
        </div>
      )}

      {/* Marks plot inside a small inset, so a drink at ±10 stays whole
          rather than half-clipped by the frame. The centre is unchanged. */}
      <div className="absolute inset-3">{children}</div>
    </div>
  );
}

/** A drink on the map. Filled when it is on your menu, hollow otherwise. */
export function DrinkDot({
  x,
  y,
  tone = 'paper',
  filled = false,
  label,
}: {
  x: number;
  y: number;
  tone?: MapTone;
  filled?: boolean;
  label?: string;
}) {
  const ink = tone === 'ink';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'absolute -translate-x-1/2 translate-y-1/2 rounded-full',
          ink
            ? filled
              ? 'h-2 w-2 bg-reveal-foreground'
              : 'h-1.5 w-1.5 bg-reveal-foreground/55'
            : cn('h-1.75 w-1.75 border border-foreground', filled ? 'bg-foreground' : 'bg-card')
        )}
        style={at(x, y)}
      />
      {label && (
        <span
          className={cn(
            'absolute translate-x-2 translate-y-1/2 whitespace-nowrap font-condensed text-xs tracking-wider',
            ink ? 'text-reveal-foreground' : 'text-foreground'
          )}
          style={at(x, y)}
        >
          {label}
        </span>
      )}
    </>
  );
}

/**
 * A tappable spot on the paper map: one or more drinks sharing a coordinate.
 * The hit area is 24px (the WCAG minimum) rather than 44: drinks sit one grid
 * step (~16px) apart on a phone, and the list under the map is the full-size
 * way to reach every drink.
 */
export function DrinkSpot({
  x,
  y,
  variant,
  selected = false,
  label,
  onSelect,
}: {
  x: number;
  y: number;
  /** `filled` on your menu or liked · `hollow` elsewhere · `muted` not for you */
  variant: 'filled' | 'hollow' | 'muted';
  selected?: boolean;
  /** Accessible name: the drinks at this spot. */
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'group absolute flex h-6 w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'z-20'
      )}
      style={at(x, y)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'rounded-full border transition-transform group-hover:scale-150',
          selected ? 'h-3 w-3 border-2 border-primary bg-card' : 'h-1.75 w-1.75',
          !selected &&
            (variant === 'filled'
              ? 'border-foreground bg-foreground'
              : variant === 'muted'
                ? 'border-muted-foreground bg-muted'
                : 'border-foreground bg-card')
        )}
      />
    </button>
  );
}

/**
 * Your dot: terracotta, a ring in the ground colour, and an ink crosshair —
 * the same mark as the coupe figure on the landing page. It does not pulse.
 * `land` animates it in once, which is the only motion on the reveal.
 */
export function YouMark({
  x,
  y,
  tone = 'paper',
  land = false,
  label = 'Your coordinate',
}: {
  x: number;
  y: number;
  tone?: MapTone;
  land?: boolean;
  label?: string;
}) {
  const ink = tone === 'ink';
  const cross = ink ? 'bg-reveal-foreground/60' : 'bg-foreground';
  return (
    <span role="img" aria-label={label}>
      <span
        aria-hidden="true"
        className={cn('absolute h-px -translate-x-1/2 translate-y-1/2', ink ? 'w-14' : 'w-11', cross)}
        style={at(x, y)}
      />
      <span
        aria-hidden="true"
        className={cn('absolute w-px -translate-x-1/2 translate-y-1/2', ink ? 'h-14' : 'h-11', cross)}
        style={at(x, y)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute -translate-x-1/2 translate-y-1/2 rounded-full',
          ink
            ? 'h-4 w-4 border-2 border-reveal-foreground bg-reveal-mark'
            : 'h-3.5 w-3.5 border-2 border-card bg-primary',
          land && 'motion-safe:animate-land'
        )}
        style={at(x, y)}
      />
    </span>
  );
}

/** Where you were before a pour: a dashed ring, joined to where you are now. */
export function TraceMark({
  from,
  to,
  tone = 'paper',
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  tone?: MapTone;
}) {
  const ink = tone === 'ink';
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cn('absolute inset-0 h-full w-full', ink ? 'stroke-reveal-trace' : 'stroke-primary')}
      >
        <path
          d={`M${toPercent(from.x)} ${100 - toPercent(from.y)} L${toPercent(to.x)} ${100 - toPercent(to.y)}`}
          strokeWidth={1}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          'absolute h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border border-dashed',
          ink ? 'border-reveal-trace' : 'border-primary'
        )}
        style={at(from.x, from.y)}
      />
    </>
  );
}

/**
 * The 2:1 thumbnail for a header: hairlines and your dot, nothing else. The
 * full square map is for the reveal and the Map tab.
 */
export function MapThumb({ x, y, className }: { x: number; y: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative h-12 w-24 shrink-0 border border-foreground bg-card', className)}>
      <div className="absolute bottom-0 left-1/2 top-0 w-px bg-border" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
      <span
        className="absolute h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary"
        style={at(x, y)}
      />
    </div>
  );
}
