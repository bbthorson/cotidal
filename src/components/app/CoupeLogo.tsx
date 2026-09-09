import { memo } from 'react';

interface CoupeLogoProps {
  className?: string;
}

/**
 * Diamond monogram logo for React components, matching Monogram.astro.
 * The diamond frame surrounds a stylized coupe rendered with clean hairline strokes.
 */
export const CoupeLogo = memo(function CoupeLogo({ className = 'w-6 h-6' }: CoupeLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="24"
        y="2"
        width="31"
        height="31"
        transform="rotate(45 24 2)"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* A coupe reduced to three strokes. */}
      <path d="M17 19 Q24 28 31 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M16 19 H32" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M24 28 V33" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M19 33.5 H29" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
});
