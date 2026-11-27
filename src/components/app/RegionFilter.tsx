import { drinks as copy, quadrants } from '@/lib/copy';
import { regionPath, type QuadrantId } from '@/lib/map/coordinates';
import { mapHref } from '@/lib/site-nav';
import { cn } from '@/lib/utils';

/**
 * The regions as a filter on the map: links (`/map?region=<id>`), so each
 * works before the script does; with `onSelect` the card changes in place.
 * "All" is the map with no region. Five items: on a phone each takes a third
 * of the row, so they set 3 + 2 rather than wrapping one onto a line alone.
 */
export function RegionFilter({ current, onSelect }: { current: QuadrantId | null; onSelect?: (id: QuadrantId | null) => void }) {
  const options = [
    { id: null, href: mapHref, label: copy.filterAll },
    ...quadrants.map((q) => ({ id: q.id, href: regionPath(q.id), label: q.name })),
  ];
  return (
    <nav aria-label={copy.filterLabel} className="border-y border-foreground py-2">
      <ul className="label-caps flex flex-wrap items-center justify-center gap-y-1 sm:gap-x-5">
        {options.map((option) => (
          <li key={option.label} className="basis-1/3 sm:basis-auto">
            <a
              href={option.href}
              aria-current={option.id === current ? 'page' : undefined}
              onClick={
                onSelect &&
                ((ev) => {
                  ev.preventDefault();
                  onSelect(option.id);
                })
              }
              className={cn(
                'flex min-h-11 items-center justify-center text-center',
                option.id === current ? 'font-bold text-foreground' : 'transition-colors hover:text-foreground hover:underline hover:underline-offset-4'
              )}
            >
              {option.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
