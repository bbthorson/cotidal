import { chart, compass, menu } from '@/lib/copy';
import { questionsHref } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import type { BarVisits } from '@/lib/pour-history';
import { useCompass } from '@/hooks/useCompass';
import { Chart, DrinkCard, DrinkRow } from './Chart';
import { AtprotoProvider } from './AtprotoProvider';
import { WaitingPick } from './WaitingPick';
import { RateSheet } from './RateSheet';
import { Empty, ScreenHeader } from './ui';
import { BarCard, BarRows, NearPanel } from './Near';
import { MenuView } from './MenuView';
import { cn } from '@/lib/utils';

/**
 * Compass: the chart first. Where you are, the shoal around you, the way you
 * came, and every drink at its place; then your menu, each drink with which
 * way it lies from you and how far, and one search over drinks and bars. A
 * drink opens in the card; a bar opens its menu (`MenuView`) in place of the
 * list: type what they pour, see it ranked for you, pick one. "Have a menu?"
 * is the same view with no bar. A pick is kept on the device until it is
 * rated (`WaitingPick`).
 *
 * Before you have a position it asks one thing: the chart, a line, and Find
 * your coordinate. Search and bars wait for "or look up a drink".
 *
 * From `lg` the chart sits beside the menu; on a phone they stack, chart
 * first, and the chart steps aside while you search.
 *
 * This file draws; what it draws and what a tap does is `useCompass`.
 */
function CompassContent({
  register,
  member,
}: {
  register: Register;
  member: { handle: string | null } | null;
}) {
  const c = useCompass(register, member);
  const { rate, openBar, selectedDrink } = c;

  // Rating opens over whichever of the two views is showing.
  const sheet = (
    <RateSheet
      request={rate.request}
      onClose={rate.close}
      register={register}
      member={member}
      profile={c.profile}
      setProfile={c.setProfile}
      pours={c.pours}
      reload={c.reload}
    />
  );

  if (c.venue) {
    return (
      <>
      <MenuView
        // A different bar is a different menu.
        key={c.venue.name ?? ''}
        venue={c.venue}
        register={register}
        profile={c.profile}
        pours={c.history}
        onBack={c.closeMenu}
        onPicked={c.picked}
      />
      {sheet}
      </>
    );
  }

  const open = c.hasCoordinate || c.browsing;

  return (
    <div
      className={cn(
        'mx-auto max-w-xl pb-6 pt-6 motion-safe:animate-in motion-safe:fade-in lg:max-w-none lg:pt-10',
        // Room to scroll the foot of the page out from under the card.
        (selectedDrink || openBar) && 'pb-card-clearance'
      )}
    >
      {c.hasCoordinate ? (
        <ScreenHeader title={compass.heading} />
      ) : (
        <ScreenHeader title={compass.startTitle} lede={compass.startBody} />
      )}
      <WaitingPick displayName={c.displayName} version={c.waitingVersion} onRate={(draft) => rate.open({ drink: draft.drink, draft })} />

      {/* Before you have a position, the one way on comes before the chart, where a phone shows it without a scroll. */}
      {!c.hasCoordinate && !c.browsing && (
        <div className="mb-6 flex flex-col items-center gap-1 lg:max-w-sm lg:items-start">
          <button type="button" onClick={() => window.location.assign(questionsHref)} className="btn btn-primary btn-lg w-full">
            {compass.findYours}
          </button>
          <button type="button" onClick={c.browse} className="link-serif flex min-h-11 items-center text-ui">
            {compass.lookUp}
          </button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* The one large thing: the chart. It steps aside on a phone while you search. */}
        <div className={cn('lg:sticky lg:top-8', c.searching && 'hidden lg:block')}>
          <Chart
            you={c.hasCoordinate ? { x: c.user.x, y: c.user.y } : null}
            menuNames={c.menuNames}
            lastPour={c.lastPour}
            lens={c.lens}
            onLens={c.setLens}
            selected={c.selected}
            onSelect={c.chooseDrink}
            register={register}
            onTakeQuiz={() => window.location.assign(questionsHref)}
            track={c.track}
            bare={!c.hasCoordinate}
          />
        </div>

        {open && (
          <div className="mt-6 lg:mt-0">
            <search className="flex">
              <label className="flex flex-1 flex-col">
                <span className="sr-only">{compass.searchLabel}</span>
                <input
                  type="search"
                  value={c.query}
                  onChange={(e) => c.setQuery(e.target.value)}
                  placeholder={compass.placeholder}
                  autoComplete="off"
                  autoFocus={c.browsing && !c.hasCoordinate}
                  className="field min-h-11 border-foreground"
                />
              </label>
            </search>
            {!c.searching && (
              <button
                type="button"
                onClick={() => c.openMenu({ name: null })}
                className="link-caps mt-2 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
              >
                {compass.haveMenu} &rarr;
              </button>
            )}

            {c.searching ? (
              <>
                <section className="mt-6">
                  <h2 className="section-title">{compass.drinksTitle}</h2>
                  {c.drinkHits.length === 0 ? (
                    // Not on the map is not undrinkable: it can still be logged.
                    <Empty
                      action={
                        <button
                          type="button"
                          onClick={() => rate.open({ drink: c.query.trim() })}
                          className="link-caps text-secondary hover:underline hover:underline-offset-4"
                        >
                          {compass.rateUnlisted(c.query.trim())} &rarr;
                        </button>
                      }
                    >
                      {compass.noDrinks}
                    </Empty>
                  ) : (
                    <ol>
                      {c.drinkHits.slice(0, 20).map((d) => (
                        <li key={d.name} className="border-b border-border">
                          <DrinkRow
                            title={c.displayName(d.name)}
                            figure={d.score}
                            figureLabel={chart.closenessOf(d.score)}
                            selected={c.selected === d.name}
                            onSelect={() => c.chooseDrink(d.name)}
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
                <BarList
                  title={compass.barsTitle}
                  bars={c.barHits}
                  onOpen={(name) => c.openMenu({ name })}
                  // Not a bar you have been to: its menu opens there all the same.
                  extra={c.offerBar}
                />
                {c.nearHits.length > 0 && (
                  <section className="mt-6">
                    <h2 className="section-title">{compass.nearTitle}</h2>
                    <BarRows bars={c.nearHits} known={c.known} selected={c.selectedBar} onSelect={c.chooseBar} />
                  </section>
                )}
              </>
            ) : (
              <>
                {c.hasCoordinate && (
                  <section className="mt-4">
                    <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-1">
                      <h2 className="font-serif text-heading font-bold">{compass.menuTitle}</h2>
                      <span className="text-meta text-muted-foreground">{compass.menuNote}</span>
                    </div>
                    {c.menu.length === 0 ? (
                      <Empty>{menu.empty}</Empty>
                    ) : (
                      <ol>
                        {c.menu.map((d, i) => (
                          <li key={d.name} className="border-b border-border">
                            <MenuRow
                              rank={i + 1}
                              title={c.displayName(d.name)}
                              way={d.way.words}
                              distance={d.way.distance}
                              selected={c.selected === d.name}
                              onSelect={() => c.chooseDrink(d.name)}
                            />
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                )}
                {c.bars.length > 0 && <BarList title={compass.yourBars} bars={c.bars} extra={null} onOpen={(name) => c.openMenu({ name })} />}
                <div className="mt-6">
                  <NearPanel nearby={c.nearby} known={c.known} selected={c.selectedBar} onSelect={c.chooseBar} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {openBar && (
        <BarCard
          bar={openBar}
          poured={c.pouredAt.get(openBar.id) ?? 0}
          onPick={() => c.openMenu({ name: openBar.name, at: { lat: openBar.lat, lon: openBar.lon } })}
          onClose={c.closeBar}
        />
      )}

      {selectedDrink && (
        <DrinkCard
          drink={selectedDrink}
          register={register}
          closeness={c.closeness[selectedDrink.name]}
          last={c.lastPour.get(selectedDrink.name)}
          sameSpot={c.sameSpot}
          onPick={c.setSelected}
          onLog={() => rate.open({ drink: selectedDrink.name })}
          onChoose={c.pickSelected}
          onClose={c.closeDrink}
        />
      )}
      {sheet}
    </div>
  );
}

/**
 * A drink on your menu: its rank, its name, which way it lies from you and
 * how far. The first is yours above all, so its name is in terracotta.
 */
function MenuRow({
  rank,
  title,
  way,
  distance,
  selected,
  onSelect,
}: {
  rank: number;
  title: string;
  way: string;
  distance: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left focus-ring-inset"
    >
      <span className="w-4 shrink-0 font-condensed text-meta tabular-nums text-muted-foreground">{rank}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'font-serif text-prose font-bold transition-colors hover:underline hover:underline-offset-4',
            selected || rank === 1 ? 'text-primary' : 'text-foreground'
          )}
        >
          {title}
        </span>
        <span className="text-meta text-muted-foreground">{way}</span>
      </span>
      <span className="shrink-0 font-condensed text-prose font-bold tabular-nums" aria-label={chart.farOf(distance)}>
        {distance}
      </span>
    </button>
  );
}

/** Bars: each opens its menu, to pick a drink there. */
function BarList({
  title,
  bars,
  extra,
  onOpen,
}: {
  title: string;
  bars: BarVisits[];
  extra: string | null;
  onOpen: (name: string) => void;
}) {
  if (bars.length === 0 && !extra) return null;
  return (
    <section className="mt-6">
      <h2 className="section-title">{title}</h2>
      <ol>
        {bars.map((b) => (
          <li key={b.name} className="border-b border-border">
            <button type="button" onClick={() => onOpen(b.name)} className="dot-leader min-h-11 w-full py-3 text-left focus-ring-inset">
              <span className="font-serif text-prose font-bold text-foreground transition-colors hover:underline hover:underline-offset-4">{b.name}</span>
              <span aria-hidden="true" className="leader" />
              <span className="shrink-0 text-meta text-muted-foreground">
                {compass.barPours(b.pours)}
              </span>
            </button>
          </li>
        ))}
        {extra && (
          <li className="border-b border-border">
            <button
              type="button"
              onClick={() => onOpen(extra)}
              className="link-caps flex py-3 text-secondary hover:underline hover:underline-offset-4 focus-ring-inset"
            >
              {compass.pickAt(extra)} &rarr;
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}

export default function Compass({
  register,
  signInEnabled,
  member,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { did: string; handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <CompassContent register={register} member={member} />
    </AtprotoProvider>
  );
}
