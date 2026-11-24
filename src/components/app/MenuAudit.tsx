import { useMemo, useState } from 'react';
import { auditMenu } from '@/lib/menu-audit';
import { exampleVenues } from '@/lib/example-menus';
import { barAudit, compass } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { titleOf, type Register } from '@/lib/register';
import { CoordinateMap, DrinkDot } from './CoordinateMap';

const SAMPLE_BLOCK = exampleVenues[0].menu.map((m) => m.name).join('\n');

/**
 * Interactive Menu Balance Audit for bars (`/bars/audit`): paste any cocktail
 * or wine list to see where it plots on the Cotidal chart, which regions are
 * covered or missing, and how many drinks carry smoke, bitterness, or anise.
 */
export function MenuAudit({ register }: { register: Register }) {
  const [text, setText] = useState('');
  const result = useMemo(() => auditMenu(text, register), [text, register]);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">{barAudit.inputLabel}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={barAudit.inputPlaceholder}
            rows={6}
            className="field py-2.5"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setText(SAMPLE_BLOCK)}
            className="link-caps text-secondary hover:underline hover:underline-offset-4"
          >
            {barAudit.sampleCta}
          </button>
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="link-caps text-muted-foreground hover:text-foreground"
            >
              {barAudit.clearCta}
            </button>
          )}
        </div>
      </div>

      {result.items.length === 0 ? (
        <p className="border-t border-border pt-6 text-ui text-muted-foreground">{barAudit.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-8">
            <CoordinateMap>
              {result.placed.map(({ drink }) => (
                <DrinkDot key={drink.name} x={drink.x} y={drink.y} filled />
              ))}
            </CoordinateMap>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="section-title">{barAudit.coverageTitle}</h2>
              <dl className="mt-2 border-t border-foreground">
                {result.coverage.map((c) => (
                  <div key={c.id} className="menu-row dot-leader py-2.5">
                    <span className="font-serif text-ui font-bold text-foreground">{c.name}</span>
                    <span aria-hidden="true" className="leader" />
                    <span className="shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">
                      {barAudit.countOf(c.count, c.percent)}
                    </span>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h2 className="section-title">{barAudit.blindSpotsTitle}</h2>
              <p className="mt-2 text-ui text-foreground">
                {result.blindSpots.length === 0
                  ? barAudit.blindSpotsNone
                  : barAudit.blindSpotsNote(result.blindSpots.map((b) => b.name))}
              </p>
            </section>

            <section>
              <h2 className="section-title">{barAudit.aversionsTitle}</h2>
              <p className="mt-2 font-condensed text-ui tabular-nums text-foreground">
                {barAudit.aversionLine(
                  result.aversionCounts.smoke,
                  result.aversionCounts.bitter,
                  result.aversionCounts.anise
                )}
              </p>
            </section>

            {result.placed.length > 0 && (
              <section>
                <h2 className="section-title">{barAudit.placedTitle(result.placed.length)}</h2>
                <ul className="mt-2 border-t border-foreground">
                  {result.placed.map(({ label, drink }) => (
                    <li key={drink.name} className="menu-row dot-leader py-2">
                      <span className="font-serif text-ui font-bold text-foreground">{label}</span>
                      <span aria-hidden="true" className="leader" />
                      <span className="shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">
                        {formatCoordinate(drink.x, drink.y)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.unplaced.length > 0 && (
              <section>
                <h2 className="section-title">{barAudit.unplacedTitle(result.unplaced.length)}</h2>
                <ul className="mt-2 border-t border-border">
                  {result.unplaced.map((item) => (
                    <li key={item.label} className="border-b border-border py-2">
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="font-serif text-ui font-bold text-foreground">{item.label}</span>
                        {item.relative && (
                          <span className="text-meta text-muted-foreground">
                            {compass.atMenu.nearClassic(titleOf(register, item.relative.name))}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-meta text-muted-foreground">{item.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
