import type { User } from '@/lib/data';
import { chart, compass, menu } from '@/lib/copy';
import { questionsHref } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import type { ScoredDrink } from '@/lib/menu-rank';
import type { BarVisits } from '@/lib/pour-history';
import { useCompass, useTopPickReason } from '@/hooks/useCompass';
import { DrinkCard, DrinkRow } from './Chart';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { WaitingPick } from './WaitingPick';
import { RateSheet } from './RateSheet';
import { Empty, GuestPrompt, ScreenHeader } from './ui';
import { BarCard, BarRows, NearPanel } from './Near';
import { MenuView } from './MenuView';
import { cn } from '@/lib/utils';

/**
 * Compass: finding something — a drink, a bar — rather than looking at
 * yourself, which is Log's (and where the map now lives). One search over
 * both. With nothing typed it points the way: your top pick, the drinks
 * closest to your taste, and the bars you have poured at. A drink opens in
 * the card; a bar opens its menu (`MenuView`) in place of the list: type what
 * they pour, see it ranked for you, pick one. "Have a menu?" is the same view
 * with no bar. A pick is kept on the device until it is rated (`WaitingPick`).
 *
 * One search runs across the page. Under it, from `lg`, the map and the bars
 * near you sit beside the menu, so a wide screen shows both at once; on a
 * phone they stack, map first, and the map steps aside while you search.
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
  const { isEnabled, openSignIn } = useAtprotoContext();
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

  return (
    <div
      className={cn(
        'mx-auto max-w-xl pb-6 pt-6 motion-safe:animate-in motion-safe:fade-in lg:max-w-none lg:pt-10',
        // Room to scroll the foot of the page out from under the card.
        (selectedDrink || openBar) && 'pb-card-clearance'
      )}
    >
      <ScreenHeader eyebrow={compass.title} title={compass.heading} />
      <WaitingPick displayName={c.displayName} version={c.waitingVersion} onRate={(draft) => rate.open({ drink: draft.drink, draft })} />

      <search className="flex">
        <label className="flex flex-1 flex-col">
          <span className="sr-only">{compass.searchLabel}</span>
          <input
            type="search"
            value={c.query}
            onChange={(e) => c.setQuery(e.target.value)}
            placeholder={compass.placeholder}
            autoComplete="off"
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

      <div className="mt-4 lg:mt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* The first view is the map: where you are, and what is around you. */}
        <div className={cn(c.searching && 'hidden lg:block')}>
          <NearPanel nearby={c.nearby} known={c.known} selected={c.selectedBar} onSelect={c.chooseBar} />
        </div>

        <div className={cn(!c.searching && 'mt-6 lg:mt-0')}>
          {c.searching ? (
            <>
              <section className="mt-6 lg:mt-0">
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
              {!c.hasCoordinate ? (
                // Without a coordinate the ranking is distance from the origin, which
                // is nobody's menu: say what it needs instead of presenting one.
                <section>
                  <h2 className="section-title">{menu.coldTitle}</h2>
                  <Empty
                    action={
                      <button
                        type="button"
                        onClick={() => window.location.assign(questionsHref)}
                        className="btn btn-primary w-full px-6"
                      >
                        {compass.findYours}
                      </button>
                    }
                  >
                    {menu.coldBody}
                  </Empty>
                </section>
              ) : c.top ? (
                <>
                  <TopPick
                    drink={c.top}
                    entry={register[c.top.name]}
                    user={c.user}
                    selected={c.selected === c.top.name}
                    onSelect={() => c.chooseDrink(c.top.name)}
                  />
                  <ol className="mt-5.5 border-t border-foreground">
                    {c.rest.map((d, i) => (
                      <li key={d.name} className="border-b border-border">
                        <DrinkRow
                          rank={i + 2}
                          title={c.displayName(d.name)}
                          figure={d.score}
                          figureLabel={chart.closenessOf(d.score)}
                          selected={c.selected === d.name}
                          onSelect={() => c.chooseDrink(d.name)}
                        />
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <Empty>{menu.empty}</Empty>
              )}
              {c.bars.length > 0 && <BarList title={compass.yourBars} bars={c.bars} extra={null} onOpen={(name) => c.openMenu({ name })} />}
            </>
          )}

          {/* One sign-in prompt, below the list, stating the benefit */}
          {isEnabled && !member && c.hasCoordinate && (
            <GuestPrompt className="mt-6" title={menu.keepTitle} body={menu.keepBody} onSignIn={openSignIn} />
          )}
        </div>
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

/**
 * The top pick: the one sheet that is yours, so it takes the letterpress
 * offset. The explanation is written once, here, rather than on tap for every
 * row.
 */
function TopPick({
  drink,
  entry,
  user,
  selected,
  onSelect,
}: {
  drink: ScoredDrink;
  entry?: Register[string];
  user: User;
  selected: boolean;
  onSelect: () => void;
}) {
  const why = useTopPickReason(drink.name, user);

  return (
    <div className="flex flex-col gap-2.5 border border-foreground bg-card p-4.5 shadow-mcm">
      <div className="flex items-baseline justify-between">
        <span className="font-condensed text-label font-semibold uppercase tracking-label text-secondary">
          {menu.topPrefix} · {menu.topTitle}
        </span>
        <span className="font-condensed text-prose font-bold tabular-nums" aria-label={chart.closenessOf(drink.score)}>
          {drink.score}
        </span>
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'text-left font-serif text-title font-bold transition-colors hover:underline hover:underline-offset-4',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {entry?.title ?? drink.name}
      </button>
      {entry?.build && <span className="text-meta text-muted-foreground">{entry.build}</span>}
      {(why.loading || why.text) && (
        <p
          aria-busy={why.loading}
          className={cn(
            // Two lines held open while it loads, so the list below does not drop when it lands.
            'min-h-16 border-t border-border pt-2.5 font-serif text-ui italic',
            why.loading && 'text-muted-foreground motion-safe:animate-pulse'
          )}
        >
          {why.loading ? '…' : why.text}
        </p>
      )}
    </div>
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
  member: { handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <CompassContent register={register} member={member} />
    </AtprotoProvider>
  );
}
