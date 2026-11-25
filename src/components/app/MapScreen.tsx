import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one layout every map page shares: the map fixed in place, and one card
 * for everything else (docs/map-first.md). Its geometry is CSS
 * (`.map-screen-*` in globals.css), so the server lays the screen out whole.
 *
 * - `live` is `/map`: the screen fills the window, and on a phone the card
 *   rests under the map and is pulled up over it (`up`) by its head.
 * - `static` is a page with no script — a drink, the front door: on a phone
 *   the map stays put at the top while the page scrolls the card up over it,
 *   so the pull is a scroll.
 *
 * From `lg` both are the same: the card is a panel down the left, and the
 * map fills the rest.
 *
 * Drawn by React so the islands and the Astro pages share one copy: a page
 * renders it on the server with no directive, and ships no script for it.
 */
export function MapScreen({
  mode,
  map,
  label,
  head,
  up = false,
  tone = 'card',
  bodyRef,
  overlay,
  rest = 'standard',
  children,
}: {
  mode: 'live' | 'static';
  /**
   * How much of a phone's first screen the card takes at rest: `tall` leaves
   * room for the front door's lede and action or a question and its plates on
   * the smallest phones, shrinking the map to make it.
   */
  rest?: 'standard' | 'tall';
  /** The map (`PalateMap`). Optional only to the type checker: an Astro page passes it as a named slot. */
  map?: ReactNode;
  /** The card's accessible name. */
  label: string;
  /** The card's head (`CardHead`), or nothing (the reveal). */
  head?: ReactNode;
  /** On a phone, the card pulled up over the map (live only). */
  up?: boolean;
  /** The reveal after a pour lays the card on the reveal's ground. */
  tone?: 'card' | 'reveal';
  bodyRef?: Ref<HTMLDivElement>;
  /** Drawn over the map: the search's results. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={mode === 'live' ? 'map-screen-live' : 'map-screen-static'} data-rest={rest === 'tall' ? 'tall' : undefined}>
      {overlay}
      <div className="map-region">{map}</div>
      <section
        aria-label={label}
        data-up={up || undefined}
        className={cn(
          'map-card z-20 flex flex-col border-t border-foreground lg:border lg:shadow-mcm',
          tone === 'reveal' ? 'bg-reveal text-reveal-foreground' : 'bg-background text-foreground'
        )}
      >
        {head}
        <div
          ref={bodyRef}
          className={cn('min-h-0 flex-1 px-4 pb-8 lg:px-5', mode === 'live' ? 'overflow-y-auto overscroll-contain' : 'lg:overflow-y-auto')}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

/**
 * The card's head: a line saying what the card is about, and on the right
 * its one control (on `/map`, More or Less). On a phone the grip above it
 * says the card can be pulled up; on `/map` the head is what is dragged
 * (pass the pointer handlers), on a static page the page scrolls.
 */
export function CardHead({
  children,
  action,
  className,
  ...rest
}: { children: ReactNode; action?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shrink-0 select-none px-4 pt-1.5 lg:px-5 lg:pt-3', className)} {...rest}>
      <span aria-hidden="true" className="mx-auto mb-2 block h-0.75 w-10 bg-border lg:hidden" />
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <p className="min-w-0 truncate">{children}</p>
        {action}
      </div>
    </div>
  );
}

/**
 * The top of a card's body on a page with no script: the title and its lede,
 * at the card's size rather than a reading page's plate (`PageTitle`).
 * Anything under the lede (a readout) is `children`.
 */
export function CardTitle({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <div className="pt-4">
      <h1 className="break-words font-serif text-title font-bold text-foreground">{title}</h1>
      {lede && <p className="mt-2 font-serif text-ui italic leading-relaxed text-muted-foreground">{lede}</p>}
      {children}
    </div>
  );
}
