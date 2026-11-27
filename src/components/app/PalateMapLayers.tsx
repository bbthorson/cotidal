import { useMemo } from 'react';
import { contourPath } from '@/lib/map/map-draw';
import { groundMasks } from '@/lib/map/map-draw';
import type { Height } from '@/lib/palate/terrain';

/** The terrain sampled every `step` points (`sampleTerrain`). */
export interface Ground {
  step: number;
  rows: Height[][];
}

/** The contour lines drawn, in rating points: high ground, and the hollow where you rated low. */
const HIGH = [6.5, 7.5, 8.5] as const;
const HOLLOW = 4;

/** Your terrain: the three washes through their masks, and the contour lines. */
export function GroundLayer({ ground, id, faded }: { ground: Ground; id: string; faded: boolean }) {
  const masks = useMemo(() => groundMasks(ground.rows), [ground]);
  const at = -10 - ground.step / 2;
  const size = 20 + ground.step;
  return (
    <g opacity={faded ? 0.4 : 1}>
      <defs>
        {(['rise', 'top', 'low'] as const).map((k) => (
          <mask key={k} id={`${id}-${k}`} maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} x={at} y={at} width={size} height={size}>
            <image href={masks[k]} x={at} y={at} width={size} height={size} preserveAspectRatio="none" />
          </mask>
        ))}
      </defs>
      <rect x={at} y={at} width={size} height={size} mask={`url(#${id}-rise)`} className="fill-accent" />
      <rect x={at} y={at} width={size} height={size} mask={`url(#${id}-top)`} className="fill-secondary" />
      <rect x={at} y={at} width={size} height={size} mask={`url(#${id}-low)`} className="fill-primary" />
      <Contours ground={ground} />
    </g>
  );
}

export function Contours({ ground, tone = 'own' }: { ground: Ground; tone?: 'own' | 'against' }) {
  const lines = useMemo(() => {
    const rows = ground.rows.map((r) => r.map((h) => h.rating));
    return {
      hollow: contourPath(rows, ground.step, HOLLOW),
      high: HIGH.map((level) => contourPath(rows, ground.step, level)),
    };
  }, [ground]);
  if (tone === 'against') {
    return (
      <g fill="none" data-against="">
        {lines.high.map((d, i) => (
          <path key={HIGH[i]} d={d} className="stroke-primary" strokeWidth={1 + i * 0.4} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    );
  }
  return (
    <g fill="none">
      <path d={lines.hollow} className="stroke-primary" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      {lines.high.map((d, i) => (
        <path
          key={HIGH[i]}
          d={d}
          className="stroke-secondary"
          strokeWidth={0.8 + i * 0.3}
          strokeDasharray={i === HIGH.length - 1 ? undefined : '4 3'}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
