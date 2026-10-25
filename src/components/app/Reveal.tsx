import { useEffect, useRef } from 'react';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { formatAxis } from '@/lib/coordinate';
import { reveal } from '@/lib/copy';
import { CoordinateMap, DrinkDot, YouMark } from './CoordinateMap';

interface RevealProps {
  x: number;
  y: number;
  onContinue: () => void;
  onRetake: () => void;
}

/**
 * The reveal. The one big move: the region's name,
 * then the dot landing on the full square map. It is set on the ink ground —
 * evolution B, used only for reveals — so the warm secret reads differently
 * from the paper instrument around it.
 */
export function Reveal({ x, y, onContinue, onRetake }: RevealProps) {
  const region = quadrantFor(x, y);
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the region name so a screen reader announces the reveal.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div
      data-focus-mode
      className="-mx-6 flex min-h-dvh flex-col bg-reveal px-6 pb-8 pt-16 text-reveal-foreground lg:mx-auto lg:my-6 lg:min-h-0 lg:max-w-md lg:pt-12"
    >
      <div className="flex flex-col gap-2.5">
        <span className="font-condensed text-xs font-semibold uppercase tracking-label text-reveal-muted">
          {reveal.eyebrow}
        </span>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-region font-normal italic outline-none">
          {region.name}.
        </h1>
        <p className="mt-1.5 font-serif text-lg leading-normal">{region.gloss}</p>
      </div>

      <CoordinateMap tone="ink" you={{ x, y }} className="mt-8">
        {drinkDatabase.map((d) => (
          <DrinkDot key={d.name} x={d.x} y={d.y} tone="ink" />
        ))}
        <YouMark x={x} y={y} tone="ink" land label={`Your coordinate, in ${region.name}`} />
      </CoordinateMap>
      <div className="mt-2.5 flex justify-between font-condensed text-xs uppercase tracking-label text-reveal-muted">
        <span>{formatAxis(x, 'x')}</span>
        <span>{formatAxis(y, 'y')}</span>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pt-8">
        <button
          type="button"
          onClick={onContinue}
          className="min-h-13 w-full border border-reveal-foreground bg-reveal-foreground font-condensed text-sm font-bold uppercase tracking-label text-reveal transition-colors hover:bg-reveal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reveal-mark focus-visible:ring-offset-2 focus-visible:ring-offset-reveal"
        >
          {reveal.continue}
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="flex min-h-11 items-center px-2 font-condensed text-meta uppercase tracking-label text-reveal-muted transition-colors hover:text-reveal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reveal-mark"
        >
          {reveal.retake}
        </button>
      </div>
    </div>
  );
}
