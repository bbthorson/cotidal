import { useEffect, useRef } from 'react';
import { quadrantFor } from '@/lib/map/coordinates';
import { formatAxis } from '@/lib/map/coordinates';
import { reveal } from '@/lib/copy';

interface RevealProps {
  x: number;
  y: number;
  onContinue: () => void;
  onRetake: () => void;
}

/**
 * The reveal, in the card on the reveal's ink ground: the region's name, its
 * gloss and where you landed, while the point settles on the map behind it
 * (`PalateMap`'s `you`, drawn by `Questions.tsx`) — the warm secret read
 * differently from the paper instrument around it.
 */
export function Reveal({ x, y, onContinue, onRetake }: RevealProps) {
  const region = quadrantFor(x, y);
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the region name so a screen reader announces the reveal.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div data-focus-mode className="flex flex-col pb-2 pt-6">
      <div className="flex flex-col gap-2.5">
        <span className="label-caps text-reveal-muted">{reveal.eyebrow}</span>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-region font-normal italic outline-none">
          {region.name}.
        </h1>
        <p className="mt-1.5 font-serif text-plate leading-normal">{region.gloss}</p>
      </div>

      <div className="mt-4 flex justify-between border-y border-reveal-rule py-2 label-caps text-reveal-muted">
        <span>{formatAxis(x, 'x')}</span>
        <span>{formatAxis(y, 'y')}</span>
      </div>

      <div className="flex flex-col items-center gap-2 pt-6">
        <button type="button" onClick={onContinue} className="btn btn-reveal btn-lg w-full">
          {reveal.continue}
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="link-caps px-2 text-reveal-muted transition-colors hover:text-reveal-foreground focus-ring-reveal"
        >
          {reveal.retake}
        </button>
      </div>
    </div>
  );
}
