import type { TrackPoint } from '@/lib/track';
import { axes, mapPage } from '@/lib/copy';

/** The figure is 16:9 (`aspect-video`); its window onto the map keeps that shape. */
const ASPECT = 16 / 9;
/** Room around the track, and the least of the map it shows, in map units. */
const MARGIN = 0.8;
const MIN_HEIGHT = 2.5;

interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The window onto the map that holds the whole track, centred, at the figure's shape. */
function frameFor(track: readonly TrackPoint[]): Frame {
  const xs = track.map((p) => p.x);
  const ys = track.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const height = Math.max(MIN_HEIGHT, maxY - minY + 2 * MARGIN, (maxX - minX + 2 * MARGIN) / ASPECT);
  const width = height * ASPECT;
  return { left: (minX + maxX) / 2 - width / 2, top: (minY + maxY) / 2 + height / 2, width, height };
}

/** Where a map point falls in the figure, as percentages from its top left. */
const place = (f: Frame, x: number, y: number) => ({ left: ((x - f.left) / f.width) * 100, top: ((f.top - y) / f.height) * 100 });

/**
 * Your track up close, under Your map's chart: from where the questions put you (a square)
 * through each pour that moved you, to where you are. Zoomed to the track,
 * so a move of half a point is visible; the axes are drawn where they cross
 * the window, and the side of the map it shows is named.
 *
 * Points are numbered as the log numbers its entries; pours that held you in
 * place share their point and its label ("1, 2").
 */
export function TrackFigure({ track }: { track: readonly TrackPoint[] }) {
  const f = frameFor(track);
  const pts = track.map((p) => place(f, p.x, p.y));
  const line = pts.map((p) => `${p.left.toFixed(2)},${p.top.toFixed(2)}`).join(' ');
  const zero = place(f, 0, 0);

  // One label per place: the numbers of the pours that left you there.
  const labels: { left: number; top: number; text: string }[] = [];
  track.forEach((p, i) => {
    if (i === 0) return;
    const last = labels[labels.length - 1];
    if (last && p.moved === 0) last.text = `${last.text}, ${i}`;
    else labels.push({ ...pts[i], text: String(i) });
  });
  const now = pts[pts.length - 1];

  return (
    <figure aria-label={mapPage.trackLabel(track.length - 1)} className="relative aspect-video w-full overflow-hidden border border-foreground bg-card">
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {zero.left > 0 && zero.left < 100 && (
          <line x1={zero.left} y1={0} x2={zero.left} y2={100} className="stroke-chart-axis" vectorEffect="non-scaling-stroke" />
        )}
        {zero.top > 0 && zero.top < 100 && (
          <line x1={0} y1={zero.top} x2={100} y2={zero.top} className="stroke-chart-axis" vectorEffect="non-scaling-stroke" />
        )}
        <polyline points={line} fill="none" className="stroke-primary" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>

      {/* The start: where the questions (or the centre) put you. */}
      <span
        aria-hidden="true"
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 border-2 border-primary bg-card"
        style={{ left: `${pts[0].left}%`, top: `${pts[0].top}%` }}
      />
      {pts.slice(1, -1).map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${p.left}%`, top: `${p.top}%` }}
        />
      ))}
      {track.length > 1 && (
        <span
          aria-hidden="true"
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
          style={{ left: `${now.left}%`, top: `${now.top}%` }}
        />
      )}
      {labels.map((l) => (
        <span
          key={l.text}
          aria-hidden="true"
          className="absolute translate-x-2 -translate-y-1/2 whitespace-nowrap font-condensed text-label font-bold text-foreground"
          style={{ left: `${l.left}%`, top: `${l.top}%` }}
        >
          {l.text}
        </span>
      ))}

      <span aria-hidden="true" className="absolute left-2 top-1.5 label-caps">
        {f.left + f.width / 2 < 0 ? axes.rich : axes.crisp} · {f.top - f.height / 2 < 0 ? axes.savory : axes.sweet}
      </span>
    </figure>
  );
}
