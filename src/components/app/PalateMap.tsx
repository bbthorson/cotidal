import { useId, useMemo, useRef, type ReactNode } from 'react';
import { drinkDatabase, type Drink } from '@/lib/drinks/data';
import { drawnDrinks } from '@/lib/map/drawn';
import { axes, explore, quadrants } from '@/lib/copy';
import { PLANE_EDGE, PLANE_VIEWBOX, placeLabels, planePercent, type LabelWant } from '@/lib/map/map-draw';
import type { QuadrantId } from '@/lib/map/coordinates';
import { LIKED_AT } from '@/lib/palate/scoring';
import { cn } from '@/lib/utils';
import { useSide, useTextMeasure } from '@/hooks/useMapLayout';
import { Contours, GroundLayer, type Ground } from './PalateMapLayers';

export type { Ground };

/** A drink pinned on the map by a bar's menu, numbered as the card's list numbers it. */
export interface Pin {
  drink: Drink;
  rank: number;
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
  frames,
  pins = null,
  focus = null,
  emptyBar = false,
  selected = null,
  hover = null,
  named,
  region = null,
  tide = false,
  onSelect,
  name = (n) => n,
  label = explore.mapLabel,
  shoal = null,
  trail = null,
  points,
  against = null,
  caption,
  children,
}: {
  /** Your terrain, or null with no coordinate. */
  ground?: Ground | null;
  /** Your latest rating of each drink you have poured, by name. */
  ratings?: ReadonlyMap<string, number>;
  /**
   * A palate told in steps, in place of `ground` and `ratings`: each frame's
   * ground and ratings, shown in turn (`.tide-frame`), the last held for
   * anyone who asks for less motion. The front door's sample.
   */
  frames?: readonly { ground: Ground; ratings: ReadonlyMap<string, number> }[];
  /** A bar's menu, placed: null when no bar is open. */
  pins?: Pin[] | null;
  /**
   * A filter's drinks (a region, `type=`, `lens=explore`), capped by `capMarks`: drawn in place of
   * the staples. Null draws the staples. Your pours, the open drink and `named` are drawn either way.
   */
  focus?: ReadonlySet<string> | null;
  /** A bar is open and nothing on its menu is placed yet. */
  emptyBar?: boolean;
  selected?: string | null;
  hover?: string | null;
  /** More drinks to draw and label, after the selected one: a drink page's neighbours, your menu. */
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
  /**
   * Where the questions' answers point so far: the shoal at their best guess,
   * one standard deviation across on each axis (`rx`, `ry`), so it narrows as
   * answers agree and stays wide when they do not.
   */
  shoal?: { x: number; y: number; rx: number; ry: number } | null;
  /**
   * How far a pour just moved you: a line from where you were (a ring) to
   * where you are, drawn under the point (`points`) that marks the end.
   */
  trail?: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  /**
   * People as points: the one the questions placed, settling when they
   * finish; someone's public map, and yours beside it. Terracotta is yours,
   * forest is someone else's (docs/design-system.md).
   */
  points?: readonly { x: number; y: number; label: string; caption?: string; tone: 'yours' | 'theirs' }[];
  /**
   * A second taste over the first, to compare them (`with=`): its high ground
   * as contour lines in terracotta and nothing else, so the two read apart —
   * the first as shaded ground, the second as lines over it.
   */
  against?: Ground | null;
  /**
   * A line about what the map shows, in its lower-left corner: what your
   * map says about you on `/map`, the sample on the front door. It is about
   * the map, so it is drawn on it rather than taking a line of the card.
   */
  caption?: ReactNode;
  /** More of the plane, drawn over the ground and under the marks (in its viewBox). */
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const side = useSide(box);
  const measure = useTextMeasure();
  const maskId = `ground${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // The library is larger than the map can show: a view draws its own drinks (`drawnDrinks`).
  const marks = useMemo(() => {
    const drawn = drawnDrinks({
      pins: pins?.map((p) => p.drink.name) ?? null,
      focus,
      also: pins ? [selected, hover] : [selected, hover, ...(named ?? []), ...(ratings?.keys() ?? [])],
    });
    return placeMarks(pins, ratings, side).filter((m) => drawn.has(m.drink.name));
  }, [pins, focus, named, selected, hover, ratings, side]);
  const captioned = !!caption;
  const view: LabelView = { pins, selected, hover, named, name, measure, side, captioned };
  const labels = useMemo(
    () => placeMapLabels(marks, view),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `view` is these
    [marks, pins, selected, hover, named, name, measure, side, captioned]
  );
  const steps = useMemo(
    () =>
      frames?.map((f) => {
        const rated = placeMarks(null, f.ratings, side);
        return { ground: f.ground, marks: rated.filter((m) => m.hedonic !== undefined), labels: placeMapLabels(rated, view) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `view` is these
    [frames, side, name, measure, captioned]
  );

  const tap = onSelect
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const toPx = rect.width / (2 * PLANE_EDGE);
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        let best: MapMark | null = null;
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
  const frameStyle = (i: number) => ({ animationDelay: `${i * FRAME_SECONDS}s` });
  const lastFrame = (i: number) => (steps && i === steps.length - 1 ? true : undefined);

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

        {ground && <GroundLayer ground={ground} id={maskId} faded={!!pins} />}
        {against && <Contours ground={against} tone="against" />}
        {steps?.map((f, i) => (
          <g key={i} className="tide-frame" data-last={lastFrame(i)} style={frameStyle(i)}>
            <GroundLayer ground={f.ground} id={`${maskId}f${i}`} faded={false} />
          </g>
        ))}

        {shoal && (
          <ellipse
            style={{ cx: shoal.x, cy: -shoal.y, rx: shoal.rx, ry: shoal.ry }}
            className="fill-shoal stroke-secondary transition-all duration-500 ease-out motion-reduce:transition-none"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {trail && (
          <g data-trail="" className="stroke-primary" fill="none">
            <line
              x1={trail.from.x}
              y1={-trail.from.y}
              x2={trail.to.x}
              y2={-trail.to.y}
              strokeWidth={2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={trail.from.x} cy={-trail.from.y} r={0.32} strokeWidth={2} className="fill-card" vectorEffect="non-scaling-stroke" />
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
            <span key={q.id} style={pct(s.x * 5.6, regionNameY(q.id, captioned))} className="map-region-name halo-card absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-subtitle">
              {q.name}
            </span>
          );
        })}
      </div>
      <div aria-hidden="true" className="pointer-events-none label-caps">
        <span style={pct(-PLANE_EDGE, 0)} className="halo-card absolute -translate-y-full pb-1 pl-1.5">{axes.rich}</span>
        <span style={pct(PLANE_EDGE, 0)} className="halo-card absolute -translate-x-full -translate-y-full pb-1 pr-1.5">{axes.crisp}</span>
        <span style={pct(0, PLANE_EDGE)} className="halo-card absolute pl-1.5 pt-1">{axes.sweet}</span>
        <span style={pct(0, -PLANE_EDGE)} className="halo-card absolute -translate-y-full pb-1 pl-1.5">{axes.savory}</span>
      </div>

      {/* The drinks. */}
      <div className={cn(!onSelect && 'pointer-events-none')} aria-hidden={onSelect ? undefined : true}>
        {marks.map((m) => (
          <Mark key={m.drink.name} m={m} pins={pins} selected={selected} hover={hover} name={name} listening={!!onSelect} />
        ))}
      </div>

      {emptyBar && (
        <p aria-hidden="true" style={pct(0, 3)} className="halo-card pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-title italic text-muted-foreground">
          {explore.noMenu}
        </p>
      )}

      <Labels labels={labels} />

      {caption && (
        <p data-testid="map-caption" className="pointer-events-none absolute bottom-1 left-1.5 max-w-full truncate border border-border bg-card px-2 py-0.5">
          {caption}
        </p>
      )}

      {points?.map((p) => (
        <span key={p.label} role="img" aria-label={p.label} style={pct(p.x, p.y)} className="absolute -translate-x-1/2 -translate-y-1/2">
          <span
            className={cn(
              'block h-4 w-4 rounded-full border-2 border-card motion-safe:animate-settle',
              p.tone === 'yours' ? 'bg-primary' : 'bg-secondary'
            )}
          />
          {p.caption && (
            <span
              aria-hidden="true"
              className="halo-card absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap label-caps font-bold text-foreground"
            >
              {p.caption}
            </span>
          )}
        </span>
      ))}

      {steps?.map((f, i) => (
        <div key={i} aria-hidden="true" className="tide-frame pointer-events-none" data-last={lastFrame(i)} style={frameStyle(i)}>
          {f.marks.map((m) => (
            <Mark key={m.drink.name} m={m} pins={null} selected={null} hover={null} name={name} listening={false} />
          ))}
          <Labels labels={f.labels} />
        </div>
      ))}
    </div>
  );
}

/**
 * Where a region's name sits, up and down: near the plane's edge, except the
 * lower-left one when a caption takes that corner, which stands clear above it.
 */
const regionNameY = (id: QuadrantId, captioned: boolean) => REGION_AT[id].y * (captioned && id === 'deep' ? 7.7 : 9.2);

/** How long each of a told palate's frames holds (`.tide-frame` gives each a sixth of the cycle). */
const FRAME_SECONDS = 5;

interface MapMark {
  drink: Drink;
  x: number;
  y: number;
  rank: number | undefined;
  hedonic: number | undefined;
}

/** Every drink where it is drawn: at its coordinate, or fanned out where a bar's pins share one. */
function placeMarks(pins: Pin[] | null, ratings: ReadonlyMap<string, number> | undefined, side: number): MapMark[] {
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
}

interface LabelView {
  pins: Pin[] | null;
  /** A caption sits in the lower-left corner, and the region name there stands clear of it. */
  captioned: boolean;
  selected: string | null;
  hover: string | null;
  named: readonly string[] | undefined;
  name: (drinkName: string) => string;
  measure: (text: string) => number;
  side: number;
}

type MapLabel = ReturnType<typeof placeMapLabels>[number];

/**
 * Which drinks are named, by what matters: the open drink, a bar's pins, your
 * pours, then any drink named only to show what is near, which gives way to
 * the region names, the axis words and the other drinks' marks.
 */
function placeMapLabels(marks: readonly MapMark[], { pins, selected, hover, named, name, measure, side, captioned }: LabelView) {
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
  const names = quadrants.map((q) => {
    const s = REGION_AT[q.id];
    const cx = px(s.x * 5.6);
    const cy = py(regionNameY(q.id, captioned));
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
    return {
      ...p,
      mark: m,
      offset: m.rank !== undefined ? 14 : 8,
      text: texts.get(p.id)!,
      rated: m.hedonic !== undefined && !pins,
      pinned: m.rank !== undefined,
      first: m.rank === 1,
    };
  });
}

/** One drink on the map: a ring, your pour of it, or a bar's numbered pin. */
function Mark({
  m,
  pins,
  selected,
  hover,
  name,
  listening,
}: {
  m: MapMark;
  pins: Pin[] | null;
  selected: string | null;
  hover: string | null;
  name: (drinkName: string) => string;
  listening: boolean;
}) {
  const isSel = m.drink.name === selected;
  const isHover = m.drink.name === hover;
  const at = pct(m.x, m.y);
  if (pins && m.rank === undefined && !isSel) {
    return <span style={at} className="absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border" />;
  }
  const label = m.hedonic !== undefined ? explore.ratedMark(name(m.drink.name), m.hedonic) : name(m.drink.name);
  return (
    <span
      style={at}
      role={listening ? 'button' : undefined}
      aria-label={listening ? label : undefined}
      aria-pressed={listening ? isSel : undefined}
      className={cn('absolute -translate-x-1/2 -translate-y-1/2', listening && 'cursor-pointer')}
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
}

function Labels({ labels }: { labels: readonly MapLabel[] }) {
  return (
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
  );
}
