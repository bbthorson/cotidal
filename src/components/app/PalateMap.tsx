import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { axes, explore, quadrants } from '@/lib/copy';
import { contourPath, NOMINAL_SIDE, PLANE_EDGE, PLANE_VIEWBOX, placeLabels, planePercent, type LabelWant } from '@/lib/map-draw';
import { groundMasks } from '@/lib/ground-masks';
import type { QuadrantId } from '@/lib/quadrant';
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

/** The terrain sampled every `step` points (`sampleTerrain`). */
export interface Ground {
  step: number;
  rows: Height[][];
}

/** The graticule's spacing, and how far past the plane it runs (the screen clips it). */
const TICK = 2.5;
const GRATICULE_REACH = 60;

/** Where each region's name sits, and its quadrant's signs. */
const REGION_AT: Record<QuadrantId, { x: number; y: number }> = {
  eddy: { x: -1, y: 1 },
  surf: { x: 1, y: 1 },
  deep: { x: -1, y: -1 },
  'salt-line': { x: 1, y: -1 },
};

const pct = (x: number, y: number) => {
  const p = planePercent(x, y);
  return { left: `${p.left}%`, top: `${p.top}%` };
};

/**
 * The map: the plane, your terrain on it (green rising where your answers
 * and ratings are high, a terracotta wash where you rated low, paler wherever
 * nothing you rated supports it), its contour lines, every drink, and your
 * pours with your rating. With a bar open, its menu's drinks are numbered
 * pins and every other drink fades to a speck. It never pans or zooms: what
 * changes is what is drawn on it.
 *
 * Drawn to scale with its box, so the server draws it whole: the plane is one
 * SVG in map units, and the marks, labels and names are laid over it in
 * percentages, so they keep their size on any screen. Only which labels fit
 * depends on the box's size in pixels: measured once the page runs, and
 * `NOMINAL_SIDE` until then (or for good, on a page with no script).
 *
 * The same component draws `/map`, where a tap selects the nearest mark
 * within reach (a fingertip covers several drinks, so the nearest wins), and
 * the reading pages, where it draws a drink and its neighbours and nothing
 * listens. Every drink is also in a list or the search, which is how a
 * keyboard reaches them.
 */
export function PalateMap({
  ground = null,
  ratings,
  pins = null,
  emptyBar = false,
  selected = null,
  hover = null,
  named,
  region = null,
  tide = false,
  onSelect,
  name = (n) => n,
  label = explore.mapLabel,
  children,
}: {
  /** Your terrain, or null with no coordinate. */
  ground?: Ground | null;
  /** Your latest rating of each drink you have poured, by name. */
  ratings?: ReadonlyMap<string, number>;
  /** A bar's menu, placed: null when no bar is open. */
  pins?: Pin[] | null;
  /** A bar is open and nothing on its menu is placed yet. */
  emptyBar?: boolean;
  selected?: string | null;
  hover?: string | null;
  /** More drinks to label, after the selected one: a drink page's neighbours. */
  named?: readonly string[];
  /** A region washed, as a drink page shows where its drink sits. */
  region?: QuadrantId | null;
  /** The tide turning about the centre, on a page that has nothing of yours to draw. */
  tide?: boolean;
  /** Listen for taps. Without it the map is a picture. */
  onSelect?: (drinkName: string) => void;
  name?: (drinkName: string) => string;
  /** Its accessible name: "your map" on `/map`, the map itself on a page that draws nobody's. */
  label?: string;
  /** More of the plane, drawn over the ground and under the marks (in its viewBox). */
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const side = useSide(box);
  const measure = useTextMeasure();
  const masks = useMemo(() => (ground ? groundMasks(ground.rows) : null), [ground]);
  const maskId = `ground${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const marks = useMemo(() => {
    const seen = new Map<string, number>();
    const pinned = new Map(pins?.map((p) => [p.drink.name, p.rank]) ?? []);
    return drinkDatabase.map((d) => {
      const rank = pinned.get(d.name);
      // Pins sharing a coordinate fan out, so each number can be read: 13px, as a share of the plane.
      let { x, y } = d;
      if (rank !== undefined) {
        const key = `${d.x},${d.y}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        if (n) {
          const reach = (13 / side) * 2 * PLANE_EDGE;
          x += Math.cos(n * 2.1) * reach;
          y -= Math.sin(n * 2.1) * reach;
        }
      }
      return { drink: d, x, y, rank, hedonic: ratings?.get(d.name) };
    });
  }, [pins, ratings, side]);

  const labels = useMemo(() => {
    const px = (v: number) => ((v + PLANE_EDGE) / (2 * PLANE_EDGE)) * side;
    const py = (v: number) => ((PLANE_EDGE - v) / (2 * PLANE_EDGE)) * side;
    const extra = new Set(named ?? []);
    const wants: LabelWant[] = [];
    const texts = new Map<string, string>();
    for (const m of marks) {
      const isSel = m.drink.name === selected || m.drink.name === hover;
      if (pins && m.rank === undefined && !isSel) continue;
      const text = m.hedonic !== undefined && !pins ? explore.ratedMark(name(m.drink.name), m.hedonic) : name(m.drink.name);
      const priority = isSel
        ? 1000
        : m.rank !== undefined
          ? 500 - m.rank
          : m.hedonic !== undefined
            ? 100 + m.hedonic
            : extra.has(m.drink.name)
              ? 50
              : 0;
      if (priority <= 0) continue;
      texts.set(m.drink.name, text);
      wants.push({
        id: m.drink.name,
        x: px(m.x),
        y: py(m.y),
        width: measure(text),
        height: 16,
        offset: m.rank !== undefined ? 14 : 8,
        priority,
        yields: priority < 100,
      });
    }
    // What a yielding label stays off: the region names, the axis words and the other drinks.
    const names = quadrants.map((q) => {
      const s = REGION_AT[q.id];
      const cx = px(s.x * 5.6);
      const cy = py(s.y * 9.2);
      const half = (q.name.length * 11) / 2;
      return { x0: cx - half, y0: cy - 15, x1: cx + half, y1: cy + 15 };
    });
    const words = [
      { x0: 0, y0: side / 2 - 20, x1: 44, y1: side / 2 },
      { x0: side - 50, y0: side / 2 - 20, x1: side, y1: side / 2 },
      { x0: side / 2, y0: 0, x1: side / 2 + 56, y1: 20 },
      { x0: side / 2, y0: side - 20, x1: side / 2 + 64, y1: side },
    ];
    const dots = marks
      .filter((m) => !pins || m.rank !== undefined)
      .map((m) => {
        const r = m.rank !== undefined ? 10 : 4;
        return { x0: px(m.x) - r, y0: py(m.y) - r, x1: px(m.x) + r, y1: py(m.y) + r };
      });
    return placeLabels(wants, { x0: 0, y0: 0, x1: side, y1: side }, [], [...names, ...words, ...dots]).map((p) => {
      const m = marks.find((k) => k.drink.name === p.id)!;
      return { ...p, mark: m, offset: m.rank !== undefined ? 14 : 8, text: texts.get(p.id)!, rated: m.hedonic !== undefined && !pins, pinned: m.rank !== undefined, first: m.rank === 1 };
    });
  }, [marks, pins, selected, hover, named, name, measure, side]);

  const tap = onSelect
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const toPx = rect.width / (2 * PLANE_EDGE);
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        let best: (typeof marks)[number] | null = null;
        let bestD = Infinity;
        for (const m of marks) {
          if (pins && m.rank === undefined) continue;
          const d = Math.hypot((m.x + PLANE_EDGE) * toPx - px, (PLANE_EDGE - m.y) * toPx - py);
          if (d < (m.rank !== undefined ? 20 : 16) && d < bestD) {
            best = m;
            bestD = d;
          }
        }
        if (best) onSelect(best.drink.name);
      }
    : undefined;

  const ticks: number[] = [];
  for (let v = -GRATICULE_REACH; v <= GRATICULE_REACH; v += TICK) ticks.push(v);
  const faded = pins ? 0.4 : 1;
  const imageAt = ground ? -10 - ground.step / 2 : 0;
  const imageSide = ground ? 20 + ground.step : 0;

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      onPointerUp={tap}
      className={cn('map-plane relative select-none', onSelect && 'touch-manipulation')}
    >
      <svg viewBox={PLANE_VIEWBOX} aria-hidden="true" className="absolute inset-0 block h-full w-full overflow-visible">
        {/* The ground beyond the plane, ruled out past the screen's edges (the screen clips it). */}
        <g className="stroke-chart-axis" strokeWidth={0.5}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={v} y1={-GRATICULE_REACH} x2={v} y2={GRATICULE_REACH} vectorEffect="non-scaling-stroke" />
              <line x1={-GRATICULE_REACH} y1={v} x2={GRATICULE_REACH} y2={v} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>

        <rect x={-PLANE_EDGE} y={-PLANE_EDGE} width={2 * PLANE_EDGE} height={2 * PLANE_EDGE} className="fill-card" />

        {region && (
          <rect
            x={REGION_AT[region].x < 0 ? -PLANE_EDGE : 0}
            y={REGION_AT[region].y > 0 ? -PLANE_EDGE : 0}
            width={PLANE_EDGE}
            height={PLANE_EDGE}
            className="fill-shoal"
          />
        )}

        {ground && masks && (
          <g opacity={faded}>
            <defs>
              {(['rise', 'top', 'low'] as const).map((k) => (
                <mask key={k} id={`${maskId}-${k}`} maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} x={imageAt} y={imageAt} width={imageSide} height={imageSide}>
                  <image href={masks[k]} x={imageAt} y={imageAt} width={imageSide} height={imageSide} preserveAspectRatio="none" />
                </mask>
              ))}
            </defs>
            <rect x={imageAt} y={imageAt} width={imageSide} height={imageSide} mask={`url(#${maskId}-rise)`} className="fill-accent" />
            <rect x={imageAt} y={imageAt} width={imageSide} height={imageSide} mask={`url(#${maskId}-top)`} className="fill-secondary" />
            <rect x={imageAt} y={imageAt} width={imageSide} height={imageSide} mask={`url(#${maskId}-low)`} className="fill-primary" />
            <Contours ground={ground} />
          </g>
        )}

        {children}

        {/* Axes and the frame. */}
        <g fill="none">
          <line x1={0} y1={-PLANE_EDGE} x2={0} y2={PLANE_EDGE} className="stroke-border" vectorEffect="non-scaling-stroke" />
          <line x1={-PLANE_EDGE} y1={0} x2={PLANE_EDGE} y2={0} className="stroke-border" vectorEffect="non-scaling-stroke" />
          <rect
            x={-PLANE_EDGE}
            y={-PLANE_EDGE}
            width={2 * PLANE_EDGE}
            height={2 * PLANE_EDGE}
            className="stroke-foreground"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>

      {tide && (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="tide-sweep" />
        </div>
      )}

      {/* The regions, named like seas: names for parts of the map, not for you. */}
      <div aria-hidden="true" className="pointer-events-none font-serif italic text-muted-foreground">
        {quadrants.map((q) => {
          const s = REGION_AT[q.id];
          return (
            <span key={q.id} style={pct(s.x * 5.6, s.y * 9.2)} className="halo-card absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-subtitle">
              {q.name}
            </span>
          );
        })}
      </div>
      <div aria-hidden="true" className="pointer-events-none font-condensed text-label uppercase tracking-label text-muted-foreground">
        <span style={pct(-PLANE_EDGE, 0)} className="halo-card absolute -translate-y-full pb-1 pl-1.5">{axes.rich}</span>
        <span style={pct(PLANE_EDGE, 0)} className="halo-card absolute -translate-x-full -translate-y-full pb-1 pr-1.5">{axes.crisp}</span>
        <span style={pct(0, PLANE_EDGE)} className="halo-card absolute pl-1.5 pt-1">{axes.sweet}</span>
        <span style={pct(0, -PLANE_EDGE)} className="halo-card absolute -translate-y-full pb-1 pl-1.5">{axes.savory}</span>
      </div>

      {/* The drinks. */}
      <div className={cn(!onSelect && 'pointer-events-none')} aria-hidden={onSelect ? undefined : true}>
        {marks.map((m) => {
          const isSel = m.drink.name === selected;
          const isHover = m.drink.name === hover;
          const at = pct(m.x, m.y);
          if (pins && m.rank === undefined && !isSel) {
            return <span key={m.drink.name} style={at} className="absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border" />;
          }
          const label = m.hedonic !== undefined ? explore.ratedMark(name(m.drink.name), m.hedonic) : name(m.drink.name);
          return (
            <span
              key={m.drink.name}
              style={at}
              role={onSelect ? 'button' : undefined}
              aria-label={onSelect ? label : undefined}
              aria-pressed={onSelect ? isSel : undefined}
              className={cn('absolute -translate-x-1/2 -translate-y-1/2', onSelect && 'cursor-pointer')}
            >
              {m.rank !== undefined ? (
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 border-card font-condensed text-label font-bold text-card',
                    isSel || isHover ? 'h-6 w-6' : 'h-5 w-5',
                    m.rank === 1 ? 'bg-primary' : 'bg-foreground'
                  )}
                >
                  {m.rank}
                </span>
              ) : (
                <span
                  className={cn(
                    'block rounded-full',
                    m.hedonic === undefined
                      ? isSel
                        ? 'h-2.5 w-2.5 bg-foreground'
                        : 'h-1.75 w-1.75 border border-foreground bg-card'
                      : m.hedonic >= LIKED_AT
                        ? 'h-2.5 w-2.5 border-2 border-primary bg-primary'
                        : 'h-2.5 w-2.5 border-2 border-primary bg-card'
                  )}
                />
              )}
              {(isSel || isHover) && (
                <span
                  className={cn(
                    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground',
                    m.rank !== undefined ? 'h-9 w-9' : 'h-6 w-6'
                  )}
                />
              )}
            </span>
          );
        })}
      </div>

      {emptyBar && (
        <p aria-hidden="true" style={pct(0, 3)} className="halo-card pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-title italic text-muted-foreground">
          {explore.noMenu}
        </p>
      )}

      <div aria-hidden="true" className="pointer-events-none font-body text-meta">
        {labels.map((l) => (
          <span
            key={l.id}
            style={{
              ...pct(l.mark.x, l.mark.y),
              transform: l.side === 'right' ? `translate(${l.offset}px, -50%)` : `translate(calc(-100% - ${l.offset}px), -50%)`,
            }}
            className={cn('halo-card absolute whitespace-nowrap', l.first || l.rated ? 'text-primary' : 'text-foreground', (l.pinned || l.rated) && 'font-bold')}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function Contours({ ground }: { ground: Ground }) {
  const lines = useMemo(() => {
    const rows = ground.rows.map((r) => r.map((h) => h.rating));
    return {
      hollow: contourPath(rows, ground.step, HOLLOW),
      high: HIGH.map((level) => contourPath(rows, ground.step, level)),
    };
  }, [ground]);
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

/** The plane's side in pixels, once the page runs; `NOMINAL_SIDE` until then. */
function useSide(box: React.RefObject<HTMLDivElement | null>): number {
  const [side, setSide] = useState(NOMINAL_SIDE);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setSide(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return side;
}

/**
 * The width of a label as the map sets it (PT Sans at the meta size): an
 * estimate on the server and until fonts are in, so the first page the
 * browser draws is the one the server sent, then measured.
 */
function useTextMeasure() {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return useMemo(
    () => (text: string) => {
      if (!ready || typeof document === 'undefined') return text.length * 7;
      ctx.current ??= document.createElement('canvas').getContext('2d');
      if (!ctx.current) return text.length * 7;
      ctx.current.font = `700 13px ${getComputedStyle(document.body).getPropertyValue('--font-pt-sans') || 'PT Sans'}, sans-serif`;
      return ctx.current.measureText(text).width;
    },
    [ready]
  );
}
