import { useMemo } from 'react';
import { clashingAversions } from '@/lib/drinks/ingredient-match';
import type { MenuItem } from '@/lib/drinks/menu-rank';
import { compass, mcp } from '@/lib/copy';
import { quadrantFor } from '@/lib/map/coordinates';
import { titleOf, type Register } from '@/lib/drinks/register';
import type { UserProfile } from '@/lib/palate/profile';
import { cn } from '@/lib/utils';

/**
 * The menu's lines as entered, each saying whether it was placed, given a
 * direction, or left unplaced, with its closest classic and any flavour you
 * avoid that an unplaced line names. Each can be taken off.
 */
export function MenuLines({
  items,
  register,
  profile,
  onRemove,
}: {
  items: MenuItem[];
  register: Register;
  profile: UserProfile;
  onRemove: (item: MenuItem) => void;
}) {
  const aversions = useMemo(
    () => ({ smoke: profile.dislikesSmoke ?? false, bitter: profile.dislikesBitter ?? false, anise: profile.dislikesAnise ?? false }),
    [profile]
  );
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 border-t border-foreground">
      {items.map((item) => {
        const clashes = !item.drink
          ? clashingAversions(`${item.label} ${item.description ?? ''}`, aversions).map((k) => mcp.flavours[k])
          : [];
        return (
          <li key={item.label} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
            <div className="mr-auto min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-serif text-prose font-bold text-foreground">{item.label}</span>
                <span className={cn('text-meta', item.drink ? 'text-secondary' : 'text-muted-foreground')}>
                  {item.drink
                    ? compass.atMenu.placed
                    : item.directional
                      ? compass.atMenu.directional(quadrantFor(item.directional.x, item.directional.y).name)
                      : compass.atMenu.unplaced}
                </span>
                {item.relative && (
                  <span className="text-meta text-muted-foreground">{compass.atMenu.nearClassic(titleOf(register, item.relative.name))}</span>
                )}
                {clashes.length > 0 && <span className="text-meta font-semibold text-primary">{compass.atMenu.clashes(clashes)}</span>}
              </div>
              {item.description && <p className="truncate text-meta text-muted-foreground">{item.description}</p>}
            </div>
            <button
              type="button"
              aria-label={compass.atMenu.remove(item.label)}
              onClick={() => onRemove(item)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </li>
        );
      })}
    </ul>
  );
}
