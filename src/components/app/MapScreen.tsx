import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one layout every page shares: the map, and one card for everything
 * else (docs/design-system.md, One kind of page). Its geometry is CSS
 * (`.map-screen` in globals.css), so the server lays the screen out whole.
 *
 * On a phone the map stays at the top while the page scrolls the card up
 * over it, and the card's app bar sticks to the top of the screen once it
 * gets there; from `lg` the card is a panel down the left that scrolls on its
 * own. The same on every page, the app screens (`/map`, `/questions`)
 * included: what a tap moves on `/map` is the page's scroll, not the card.
 *
 * The card comes before the map in the page, so a screen reader or a
 * keyboard meets the app bar and the card's contents first and the map, a
 * figure, after; CSS puts the map on top.
 *
 * Drawn by React so the islands and the Astro pages share one copy: a page
 * renders it on the server with no directive, and ships no script for it.
 */
export function MapScreen({
  map,
  label,
  head,
  tone = 'card',
  cardRef,
  bodyRef,
  overlay,
  rest = 'standard',
  bar,
  children,
}: {
  /**
   * How much of a phone's first screen the card takes at rest: `tall` leaves
   * room for the front door's lede and one action, or a question and its
   * plates, on the smallest phones, and shrinks the map to make it.
   */
  rest?: 'standard' | 'tall';
  /**
   * The app bar (`AppBar.astro`), at the top of the card, stuck to the top of
   * the screen as the card scrolls up. Optional only to the type checker: an
   * Astro page passes it as a named slot.
   */
  bar?: ReactNode;
  /** The map (`PalateMap`). Optional only to the type checker, as `bar`. */
  map?: ReactNode;
  /** The card's accessible name. */
  label: string;
  /** The card's head (`CardHead`), or nothing. */
  head?: ReactNode;
  /** The reveal after a pour lays the card on the reveal's ground. */
  tone?: 'card' | 'reveal';
  /** The card itself, for scrolling it to the top of a phone's screen. */
  cardRef?: Ref<HTMLElement>;
  /** The card's body, which scrolls on its own from `lg`. */
  bodyRef?: Ref<HTMLDivElement>;
  /** Drawn over the map: the search's results. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const ground = tone === 'reveal' ? 'bg-reveal text-reveal-foreground' : 'bg-card text-foreground';
  return (
    <div className="map-screen" data-rest={rest === 'tall' ? 'tall' : undefined}>
      {overlay}
      <section
        ref={cardRef}
        aria-label={label}
        className={cn('map-card z-20 flex flex-col border-t border-foreground lg:border lg:shadow-mcm', ground)}
      >
        <span aria-hidden="true" className="mx-auto mt-1.5 block h-0.75 w-10 shrink-0 bg-border lg:hidden" />
        {bar && (
          <div data-site-chrome className={cn('map-bar shrink-0 px-4 pt-2 lg:px-5 lg:pt-4', ground)}>
            {bar}
          </div>
        )}
        {head}
        <div ref={bodyRef} className="min-h-0 flex-1 px-4 pb-8 lg:overflow-y-auto lg:overscroll-contain lg:px-5">
          {children}
        </div>
      </section>
      <div className="map-region">{map}</div>
    </div>
  );
}

/**
 * The card's head: a line saying what the card is about, and on the right
 * at most one control (on `/map`, Rate a drink from `lg`). The grip that says
 * the card can be pulled up is the card's own, above the app bar; pulling is
 * scrolling the page.
 */
export function CardHead({
  children,
  action,
  className,
  ...rest
}: { children: ReactNode; action?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shrink-0 select-none px-4 pt-2 lg:px-5 lg:pt-3', className)} {...rest}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <p className="min-w-0 truncate">{children}</p>
        {action}
      </div>
    </div>
  );
}
