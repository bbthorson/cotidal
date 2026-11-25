import { useEffect, useMemo, useRef, useState } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import type { PourRecord } from '@/lib/atproto/records';
import { axes, explore, quadrants } from '@/lib/copy';
import { contour, PLANE_EDGE, placeLabels, toScreen, type LabelWant, type PlaneFit } from '@/lib/map-draw';
import { LIKED_AT } from '@/lib/scoring';
import type { Height } from '@/lib/terrain';
import { cn } from '@/lib/utils';

/** The contour lines drawn, in rating points: high ground, and the hollow where you rated low. */
const HIGH = [6.5, 7.5, 8.5] as const;
const HOLLOW = 4;

/** A drink pinned on the map by a bar's menu, numbered as the card's list numbers it. */
export interface Pin {
  drink: Drink;
  rank: number;
}

/**
 * The map, fixed in place as the screen's background: the plane, your
 * terrain on it (green rising where your answers and ratings are high, a
 * terracotta wash where you rated low, paler wherever nothing you rated
 * supports it), its contour lines, every drink, and your pours with your
 * rating. With a bar open, its menu's drinks are numbered pins and every
 * other drink fades to a speck. It never pans or zooms: what changes is
 * what is drawn on it.
 *
 * Measured after mount, so the server renders the space and nothing in it.
 * A tap selects the nearest mark within reach (a fingertip covers several
 * drinks, so the nearest wins); every drink is also in the card's lists and
 * the search, which is how a keyboard reaches them.
 */
export function PalateMap({
  fit,
  width,
  height,
  ground,
  pours,
  pins,
  emptyBar,
  selected,
  hover,
  onSelect,
  name,
}: {
  fit: PlaneFit | null;
  width: number;
  height: number;
  /** The terrain sampled every half point (`sampleTerrain`), or null with no coordinate. */
  ground: { step: number; rows: Height[][] } | null;
  /** Your latest pour of each drink. */
  pours: Map<string, PourRecord>;
  /** A bar's menu, placed: null when no bar is open. */
  pins: Pin[] | null;
  /** A bar is open and nothing on its menu is placed yet. */
  emptyBar: boolean;
  selected: string | null;
  hover: string | null;
  onSelect: (drinkName: string) => void;
  name: (drinkName: string) => string;
}) {
  const groundImage = useGroundImage(ground);
  const measure = useTextMeasure();

  const marks = useMemo(() => {
    if (!fit) return [];
    const seen = new Map<string, number>();
    const pinned = new Map(pins?.map((p) => [p.drink.name, p.rank]) ?? []);
    return drinkDatabase.map((d) => {
      let { x, y } = toScreen(fit, d.x, d.y);
      const rank = pinned.get(d.name);
      // Pins sharing a coordinate fan out, so each number can be read.
      if (rank !== undefined) {
        const key = `${d.x},${d.y}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        if (n) {
          x += Math.cos(n * 2.1) * 13;
          y += Math.sin(n * 2.1) * 13;
        }
      }
      return { drink: d, x, y, rank, hedonic: pours.get(d.name)?.rating.hedonic };
    });
  }, [fit, pins, pours]);

  const labels = useMemo(() => {
    if (!fit) return [];
    const wants: LabelWant[] = [];
    for (const m of marks) {
      const isSel = m.drink.name === selected || m.drink.name === hover;
      if (pins && m.rank === undefined && !isSel) continue;
      const text = m.hedonic !== undefined && !pins ? explore.ratedMark(name(m.drink.name), m.hedonic) : name(m.drink.name);
      const priority = isSel ? 1000 : m.rank !== undefined ? 500 - m.rank : m.hedonic !== undefined ? 100 + m.hedonic : 0;
      if (priority <= 0) continue;
      wants.push({ id: m.drink.name, x: m.x, y: m.y, width: measure(text), height: 16, offset: m.rank !== undefined ? 14 : 8, priority });
    }
    const edge = toScreen(fit, -PLANE_EDGE, PLANE_EDGE);
    const far = toScreen(fit, PLANE_EDGE, -PLANE_EDGE);
    const texts = new Map(wants.map((w) => [w.id, w]));
    return placeLabels(wants, { x0: edge.x, y0: edge.y, x1: far.x, y1: far.y }).map((p) => {
      const m = marks.find((k) => k.drink.name === p.id)!;
      return { ...p, text: m.hedonic !== undefined && !pins ? explore.ratedMark(name(p.id), m.hedonic) : name(p.id), rated: m.hedonic !== undefined, pinned: m.rank !== undefined, first: m.rank === 1, width: texts.get(p.id)!.width };
    });
  }, [fit, marks, pins, selected, hover, name, measure]);

  if (!fit || width === 0) return <div aria-hidden="true" className="absolute inset-0" />;

  const at = (x: number, y: number) => toScreen(fit, x, y);
  const tl = at(-PLANE_EDGE, PLANE_EDGE);
  const side = 2 * PLANE_EDGE * fit.scale;
  const ticks: number[] = [];
  for (let v = -40; v <= 40; v += 2.5) ticks.push(v);

  const tap = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    let best: (typeof marks)[number] | null = null;
    let bestD = Infinity;
    for (const m of marks) {
      if (pins && m.rank === undefined) continue;
      const d = Math.hypot(m.x - px, m.y - py);
      if (d < (m.rank !== undefined ? 20 : 16) && d < bestD) {
        best = m;
        bestD = d;
      }
    }
    if (best) onSelect(best.drink.name);
  };

  return (
    <svg
      width={width}
      height={height}
      onPointerUp={tap}
      aria-label={explore.mapLabel}
      className="absolute inset-0 block touch-manipulation select-none"
    >
      {/* The ground beyond the plane, ruled to the edges of the screen. */}
      {ticks.map((v) => {
        const p = at(v, v);
        return (
          <g key={v} aria-hidden="true" className="stroke-chart-axis" strokeWidth={0.5}>
            {p.x > 0 && p.x < width && <line x1={p.x} y1={0} x2={p.x} y2={height} />}
            {p.y > 0 && p.y < height && <line x1={0} y1={p.y} x2={width} y2={p.y} />}
          </g>
        );
      })}

      <rect x={tl.x} y={tl.y} width={side} height={side} className="fill-card" />
      {groundImage && (
        <image
          href={groundImage}
          x={at(-10 - ground!.step / 2, 0).x}
          y={at(0, 10 + ground!.step / 2).y}
          width={(20 + ground!.step) * fit.scale}
          height={(20 + ground!.step) * fit.scale}
          preserveAspectRatio="none"
          opacity={pins ? 0.4 : 1}
        />
      )}
      {ground && (
        <g aria-hidden="true" fill="none" opacity={pins ? 0.4 : 1}>
          <ContourPath ground={ground} level={HOLLOW} fit={fit} className="stroke-primary" dash="2 3" />
          {HIGH.map((level, i) => (
            <ContourPath
              key={level}
              ground={ground}
              level={level}
              fit={fit}
              className="stroke-secondary"
              width={0.8 + i * 0.3}
              dash={i === HIGH.length - 1 ? undefined : '4 3'}
            />
          ))}
        </g>
      )}

      {/* Axes and the frame. */}
      <g aria-hidden="true">
        <line x1={at(0, 0).x} y1={tl.y} x2={at(0, 0).x} y2={tl.y + side} className="stroke-border" />
        <line x1={tl.x} y1={at(0, 0).y} x2={tl.x + side} y2={at(0, 0).y} className="stroke-border" />
        <rect x={tl.x} y={tl.y} width={side} height={side} fill="none" className="stroke-foreground" />
      </g>

      {/* The regions, named like seas: names for parts of the map, not for you. */}
      <g aria-hidden="true" className="fill-muted-foreground font-serif italic">
        {quadrants.map((q) => {
          const sx = q.id === 'eddy' || q.id === 'deep' ? -1 : 1;
          const sy = q.id === 'eddy' || q.id === 'surf' ? 1 : -1;
          const p = at(sx * 5.6, sy * 9.2);
          return (
            <text key={q.id} x={p.x} y={p.y + 6} textAnchor="middle" className="text-subtitle paint-card">
              {q.name}
            </text>
          );
        })}
      </g>
      <g aria-hidden="true" className="fill-muted-foreground font-condensed text-label uppercase tracking-label">
        <text x={tl.x + 6} y={at(0, 0).y - 6} className="paint-card">{axes.rich}</text>
        <text x={tl.x + side - 6} y={at(0, 0).y - 6} textAnchor="end" className="paint-card">{axes.crisp}</text>
        <text x={at(0, 0).x + 6} y={tl.y + 16} className="paint-card">{axes.sweet}</text>
        <text x={at(0, 0).x + 6} y={tl.y + side - 8} className="paint-card">{axes.savory}</text>
      </g>

      {/* The drinks. */}
      <g>
        {marks.map((m) => {
          const isSel = m.drink.name === selected;
          const isHover = m.drink.name === hover;
          if (pins && m.rank === undefined && !isSel) {
            return <circle key={m.drink.name} cx={m.x} cy={m.y} r={1.8} className="fill-border" aria-hidden="true" />;
          }
          const label = m.hedonic !== undefined ? explore.ratedMark(name(m.drink.name), m.hedonic) : name(m.drink.name);
          return (
            <g key={m.drink.name} role="button" aria-label={label} aria-pressed={isSel} className="cursor-pointer">
              {m.rank !== undefined ? (
                <>
                  <circle cx={m.x} cy={m.y} r={isSel || isHover ? 12 : 10} strokeWidth={2} className={cn('stroke-card', m.rank === 1 ? 'fill-primary' : 'fill-foreground')} />
                  <text x={m.x} y={m.y + 4} textAnchor="middle" className="fill-card font-condensed text-label font-bold">
                    {m.rank}
                  </text>
                </>
              ) : (
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={m.hedonic !== undefined ? 4.6 : 3.2}
                  strokeWidth={m.hedonic !== undefined ? 1.6 : 1}
                  className={cn(
                    m.hedonic === undefined ? 'fill-card stroke-foreground' : m.hedonic >= LIKED_AT ? 'fill-primary stroke-primary' : 'fill-card stroke-primary'
                  )}
                />
              )}
              {(isSel || isHover) && <circle cx={m.x} cy={m.y} r={m.rank !== undefined ? 17 : 11} fill="none" strokeWidth={1.5} className="stroke-foreground" />}
            </g>
          );
        })}
      </g>

      {emptyBar && (
        <g aria-hidden="true" className="fill-muted-foreground">
          <text x={at(0, 0).x} y={at(0, 3).y} textAnchor="middle" className="paint-card font-serif text-title italic">
            {explore.noMenu}
          </text>
        </g>
      )}

      <g aria-hidden="true" className="font-body text-meta">
        {labels.map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y + 4.5}
            className={cn('paint-card', l.first || l.rated ? 'fill-primary' : 'fill-foreground', (l.pinned || l.rated) && 'font-bold')}
          >
            {l.text}
          </text>
        ))}
      </g>
    </svg>
  );
}

function ContourPath({
  ground,
  level,
  fit,
  className,
  width = 1,
  dash,
}: {
  ground: { step: number; rows: Height[][] };
  level: number;
  fit: PlaneFit;
  className: string;
  width?: number;
  dash?: string;
}) {
  const d = useMemo(() => {
    const rows = ground.rows.map((r) => r.map((h) => h.rating));
    return contour(rows, ground.step, level)
      .map(([x0, y0, x1, y1]) => {
        const a = toScreen(fit, x0, y0);
        const b = toScreen(fit, x1, y1);
        return `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      })
      .join('');
  }, [ground, level, fit]);
  return <path d={d} className={className} strokeWidth={width} strokeDasharray={dash} />;
}

/**
 * The terrain as a small image, one pixel per sample, which the browser
 * smooths as it scales it up: sage rising to forest where the ground is high,
 * a terracotta wash where it is low, paler where `sd` says nothing supports
 * it. Colours are the tokens, read from the page (`--accent`, `--secondary`,
 * `--primary`, `--card`).
 */
function useGroundImage(ground: { step: number; rows: Height[][] } | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ground) {
      setUrl(null);
      return;
    }
    const n = ground.rows.length;
    const canvas = document.createElement('canvas');
    canvas.width = n;
    canvas.height = n;
    const g = canvas.getContext('2d');
    if (!g) return;
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => `hsl(${css.getPropertyValue(name).trim()})`;
    const [card, sage, forest, terracotta] = ['--card', '--accent', '--secondary', '--primary'].map(token);
    g.fillStyle = card;
    g.fillRect(0, 0, n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const { rating, sd } = ground.rows[j][i];
        const sure = Math.max(0.3, 1 - sd / 3.5);
        const py = n - 1 - j;
        if (rating >= 5.5) {
          const rise = Math.min(1, (rating - 5.5) / 3.3);
          g.globalAlpha = Math.min(0.9, rise * 1.4) * sure;
          g.fillStyle = sage;
          g.fillRect(i, py, 1, 1);
          if (rise > 0.45) {
            g.globalAlpha = (rise - 0.45) * 0.7 * sure;
            g.fillStyle = forest;
            g.fillRect(i, py, 1, 1);
          }
        } else if (rating < 4.5) {
          g.globalAlpha = Math.min(1, (4.5 - rating) / 1.5) * 0.28 * sure;
          g.fillStyle = terracotta;
          g.fillRect(i, py, 1, 1);
        }
      }
    }
    setUrl(canvas.toDataURL());
  }, [ground]);
  return url;
}

/** The width of a label as the map sets it (PT Sans at the meta size), measured once fonts are in. */
function useTextMeasure() {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  // Fonts arriving changes every width: a new measure, so the labels are placed again.
  const [ready, setReady] = useState(0);
  useEffect(() => {
    void document.fonts?.ready.then(() => setReady((n) => n + 1));
  }, []);
  return useMemo(
    () => (text: string) => {
      if (typeof document === 'undefined') return text.length * 7;
      ctx.current ??= document.createElement('canvas').getContext('2d');
      if (!ctx.current) return text.length * 7;
      ctx.current.font = `700 13px ${getComputedStyle(document.body).getPropertyValue('--font-pt-sans') || 'PT Sans'}, sans-serif`;
      return ctx.current.measureText(text).width;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ready` is the point: fonts changed the widths
    [ready]
  );
}
