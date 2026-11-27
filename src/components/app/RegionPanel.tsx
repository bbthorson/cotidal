import type { Drink } from '@/lib/drinks/data';
import { explore, quadrants, regionPage } from '@/lib/copy';
import { formatCoordinate } from '@/lib/map/coordinates';
import type { QuadrantId } from '@/lib/map/coordinates';
import type { Register } from '@/lib/drinks/register';
import { usePrerendered } from '@/hooks/usePrerendered';
import { regionEntryPath, type RegionEntryData } from '@/lib/map/region-entry';
import { DrinkRow } from './DrinkRow';
import { RegionEntry } from './RegionEntry';
import { RegionFilter } from './RegionFilter';
import { ScreenHeader } from './ui';

export interface RegionPanelProps {
  regionId: QuadrantId;
  drinks: Drink[];
  register: Register;
  name: (drinkName: string) => string;
  initialRegion: { id: QuadrantId; entry: RegionEntryData } | null;
  onOpenRegion: (id: QuadrantId | null) => void;
  onChooseDrink: (drinkName: string) => void;
}

/**
 * A region, opened in the card (`?region=`): a filter on the map, which
 * washes the region and names its drinks. The card lists them — each opens
 * in the card and comes back here — then the region's write-up.
 */
export function RegionPanel({
  regionId,
  drinks,
  register,
  name,
  initialRegion,
  onOpenRegion,
  onChooseDrink,
}: RegionPanelProps) {
  const region = quadrants.find((q) => q.id === regionId)!;
  const entry = usePrerendered(regionEntryPath(region.id), initialRegion && { path: regionEntryPath(initialRegion.id), data: initialRegion.entry });
  return (
    <div className="pt-1">
      <button type="button" onClick={() => onOpenRegion(null)} className="link-caps flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {explore.backToStart}
      </button>
      <ScreenHeader title={region.name} gloss={region.gloss} />
      <RegionFilter current={region.id} onSelect={onOpenRegion} />
      <section className="mt-6" data-testid="region-drinks">
        <ul className="border-t border-foreground">
          {drinks.map((d) => (
            <DrinkRow
              key={d.name}
              title={name(d.name)}
              figure={formatCoordinate(d.x, d.y)}
              note={register[d.name]?.build}
              onSelect={() => onChooseDrink(d.name)}
            />
          ))}
        </ul>
        <p className="mt-3 font-serif text-ui italic leading-relaxed text-muted-foreground">{regionPage.placedNote}</p>
      </section>
      {entry?.id === region.id && <RegionEntry entry={entry} />}
    </div>
  );
}
