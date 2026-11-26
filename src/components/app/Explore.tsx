import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Drink } from '@/lib/data';
import type { PourRecord } from '@/lib/atproto/records';
import { chart, compass, explore, mapPage, pour, taste } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { quadrantFor } from '@/lib/quadrant';
import { publicMapPath, startOverPath } from '@/lib/atproto/paths';
import { drinksHref, questionsHref } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { useExplore, type Explore as ExploreState } from '@/hooks/useExplore';
import { cn } from '@/lib/utils';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { MenuView } from './MenuView';
import { NearList } from './Near';
import { CardHead as CardHeadFrame, MapScreen } from './MapScreen';
import { PalateMap } from './PalateMap';
import { PourLedger } from './PourLedger';
import { RatePanel } from './RatePanel';
import { SearchBox } from './SearchBox';
import { StartOver } from './StartOver';
import { TrackFigure } from './TrackFigure';
import { WaitingPick } from './WaitingPick';
import { Empty, GuestPrompt } from './ui';

/**
 * The app, on one screen: your map fixed in place as the background, the
 * search in the header, and one card for everything else. On a phone the map
 * is the full width under the header and the card rests in the space below
 * it, pulled up over the map by its head; from `lg` the card is a panel down
 * the left and the map fills the rest. Nothing here moves the map: a bar, a
 * drink or a pour changes what is drawn on it.
 *
 * The card holds, in turn: where to next (your menu, bars, your pours), a
 * drink, a bar's menu, or rating a pour. This file draws; what it draws and
 * what a tap does is `useExplore`.
 */
function ExploreContent({
  register,
  member,
  initialQuery,
  bar,
}: {
  register: Register;
  member: { did: string; handle: string | null } | null;
  initialQuery: string;
  bar?: ReactNode;
}) {
  const e = useExplore(register, member, initialQuery);
  const { isEnabled, openSignIn } = useAtprotoContext();
  const body = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const [reveal, setReveal] = useState(false);

  // A different card starts from its top. On a phone the card is the page's scroll: something about a place on
  // the map (a drink, a bar, back to where to next) scrolls back to the top, so the map shows and pushes the card
  // down; rating scrolls the card up to the top of the screen, where it has the room (`e.up`). From `lg` the card
  // is a panel that scrolls on its own, and starts from its top.
  const cardKey = e.rate.request ? 'rate' : e.selectedDrink ? `drink:${e.selected}` : e.venue ? `bar:${e.venue.name ?? ''}` : 'home';
  const cardUp = e.up || !!e.rate.request;
  const arrived = useRef(false);
  useEffect(() => {
    // The first card is where the page already is: nothing to scroll to.
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (window.matchMedia('(min-width: 1024px)').matches) {
      body.current?.scrollTo({ top: 0, behavior });
      return;
    }
    if (cardUp && card.current) window.scrollTo({ top: window.scrollY + card.current.getBoundingClientRect().top, behavior });
    else window.scrollTo({ top: 0, behavior });
  }, [cardKey, cardUp]);

  const onReveal = useCallback((r: boolean) => setReveal(r), []);
  const closeRate = () => {
    e.rate.close();
    e.setUp(false);
  };

  const ratings = useMemo(() => new Map([...e.lastPour].map(([n, p]) => [n, p.rating.hedonic])), [e.lastPour]);
  const pins = e.venue ? e.ranked.map((r, i) => ({ drink: r.drink, rank: i + 1 })) : null;

  let content;
  // Where to next is the one card whose action is the screen's: Rate a drink.
  let home = false;
  if (e.rate.request) {
    content = (
      <RatePanel
        request={e.rate.request}
        onClose={closeRate}
        register={register}
        member={member}
        profile={e.profile}
        setProfile={e.setProfile}
        pours={e.pours}
        reload={e.reload}
        onReveal={onReveal}
      />
    );
  } else if (e.selectedDrink) {
    content = <DrinkPanel e={e} drink={e.selectedDrink} />;
  } else if (e.venue) {
    content = (
      <MenuView
        key={e.venue.name ?? ''}
        venue={e.venue}
        register={register}
        profile={e.profile}
        items={e.items}
        setItems={e.setItems}
        typedBar={e.typedBar}
        setTypedBar={e.setTypedBar}
        ranked={e.ranked}
        reasonFor={e.reasonFor}
        onBack={() => {
          e.leaveBar();
          e.setQuery('');
        }}
        onPick={e.pick}
      />
    );
  } else if (e.cold) {
    content = (
      <ColdState
        onSignIn={openSignIn}
        onGuest={() => {
          e.setProfile(neutralProfile);
          e.rate.open();
        }}
      />
    );
  } else {
    content = <Home e={e} member={member} signInEnabled={isEnabled} onSignIn={openSignIn} />;
    home = true;
  }

  return (
    <MapScreen
      bar={bar}
      label={explore.cardLabel}
      tone={reveal ? 'reveal' : 'card'}
      head={reveal ? undefined : <CardHead e={e} rateHere={home} />}
      cardRef={card}
      bodyRef={body}
      map={
        <PalateMap
          ground={e.ground}
          ratings={ratings}
          pins={pins}
          emptyBar={!!e.venue && e.ranked.length === 0}
          selected={e.selected}
          hover={e.hover}
          onSelect={e.chooseDrink}
          name={e.name}
        />
      }
    >
      {/* The search is the card's first line, but not while rating or on the reveal, which have the card to themselves. */}
      {!e.rate.request && !reveal && (
        <div className="pt-3">
          <SearchBox e={e} />
        </div>
      )}
      {content}
    </MapScreen>
  );
}

/**
 * The card's head: what your map says about you, in the axes' words, and from
 * `lg` the screen's one action. Pulling the card up on a phone is scrolling
 * the page, as on every page.
 */
function CardHead({ e, rateHere }: { e: ExploreState; rateHere: boolean }) {
  return (
    <CardHeadFrame
      action={
        /* From `lg` the screen's one action sits here, above the list; on a phone it floats (`Home`). */
        rateHere && (
          <button type="button" onClick={() => e.rate.open()} className="btn btn-primary hidden shrink-0 px-4 lg:inline-flex">
            {mapPage.rateDrink}
          </button>
        )
      }
    >
      {e.leanings.length > 0 ? (
        <>
          <span className="label-caps">{taste.label} </span>
          <span className="font-serif text-ui italic text-primary">{taste.phrases(e.leanings)}</span>
        </>
      ) : (
        <span className="label-caps">{explore.noPosition}</span>
      )}
    </CardHeadFrame>
  );
}

/** Where to next: a waiting pick, your menu, your bars and bars near you, and your pours. */
function Home({
  e,
  member,
  signInEnabled,
  onSignIn,
}: {
  e: ExploreState;
  member: { did: string; handle: string | null } | null;
  signInEnabled: boolean;
  onSignIn: () => void;
}) {
  const statCols = e.stats.length === 3 ? 3 : 2;
  return (
    <div className="pb-20 pt-3 lg:pb-0">
      {/* The card's head says where you are and each section names itself, so the title is for a screen reader alone. */}
      <h1 className="sr-only">{explore.heading}</h1>
      {/*
        On a phone the screen's one action floats at the foot of the screen, over the card, where a thumb is;
        first in the card so a keyboard reaches it first. Hidden while the search has the keyboard (`.rate-float`).
        From `lg` it is in the card's head instead.
      */}
      <button type="button" onClick={() => e.rate.open()} className="rate-float btn btn-primary fixed bottom-safe-b right-4 z-30 px-5 shadow-mcm lg:hidden">
        {mapPage.rateDrink}
      </button>
      <div>
        <WaitingPick displayName={e.name} version={e.pickVersion} onRate={(draft) => e.rate.open({ drink: draft.drink, draft })} />
      </div>

      <section className="mt-2">
        <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-1">
          <h2 className="font-serif text-heading font-bold">{compass.menuTitle}</h2>
          <span className="text-meta text-muted-foreground">{compass.menuNote}</span>
        </div>
        {e.menu.length === 0 ? (
          <Empty>{compass.noDrinks}</Empty>
        ) : (
          <ol>
            {e.menu.map((d, i) => (
              <li key={d.name} className="border-b border-border">
                <MenuRow
                  rank={i + 1}
                  title={e.name(d.name)}
                  reason={d.reason}
                  selected={e.selected === d.name}
                  onSelect={() => e.chooseDrink(d.name)}
                  onHover={(on) => e.setHover(on ? d.name : null)}
                />
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          onClick={() => e.openBar({ name: null })}
          className="link-caps mt-2 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
        >
          {compass.haveMenu} &rarr;
        </button>
      </section>

      {e.barHits.length > 0 && !e.searching && (
        <section className="mt-6">
          <h2 className="section-title">{compass.yourBars}</h2>
          <ol>
            {e.barHits.map((b) => (
              <li key={b.name} className="border-b border-border">
                <button type="button" onClick={() => e.openBar({ name: b.name })} className="dot-leader min-h-11 w-full py-3 text-left focus-ring-inset">
                  <span className="font-serif text-prose font-bold text-foreground hover:underline hover:underline-offset-4">{b.name}</span>
                  <span aria-hidden="true" className="leader" />
                  <span className="shrink-0 text-meta text-muted-foreground">{compass.barPours(b.pours)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <NearList nearby={e.nearby} onOpen={(b) => e.openBar({ name: b.name, at: { lat: b.lat, lon: b.lon } })} />

      <section id="yours" className="mt-8">
        <h2 className="section-title">{explore.yoursTitle}</h2>
        {e.stats.length > 0 && (
          <dl className={cn('grid border-b border-border', statCols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {e.stats.map((st, i) => (
              <div
                key={st.label}
                className={cn('flex flex-col gap-0.5 py-2.5', i % statCols !== 0 && 'border-l border-border pl-3.5', i % statCols !== statCols - 1 && 'pr-3.5')}
              >
                <dt className="label-caps">{st.label}</dt>
                <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {e.track && e.track.length > 1 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="label-caps">{mapPage.upClose}</p>
            <TrackFigure track={e.track} />
          </div>
        )}
        <h3 className="mt-6 font-serif text-heading font-bold">{mapPage.ledgerTitle}</h3>
        <PourLedger
          pours={e.history}
          register={e.register}
          empty={mapPage.ledgerEmpty}
          loading={e.pours === null}
          track={e.track}
          startLabel={e.startLabel}
        />
        {member && (
          <a href={`${publicMapPath(member.handle ?? member.did)}#compare`} className="link-caps mt-6 flex text-secondary hover:underline hover:underline-offset-4">
            {mapPage.compareLink} &rarr;
          </a>
        )}
        {!e.isMember && signInEnabled && e.history.length > 0 && (
          <GuestPrompt className="mt-8" title={mapPage.guestTitle} body={mapPage.guestBody} onSignIn={onSignIn} />
        )}
        {!e.isMember && <StartOver onConfirm={() => window.location.assign(startOverPath)} flush={signInEnabled && e.history.length > 0} />}
      </section>
    </div>
  );
}

/** A drink on your menu: its rank, its name, and what put it there. The first is yours above all, in terracotta. */
function MenuRow({
  rank,
  title,
  reason,
  selected,
  onSelect,
  onHover,
}: {
  rank: number;
  title: string;
  reason: string;
  selected: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
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
        <span className="text-meta text-muted-foreground">{reason}</span>
      </span>
    </button>
  );
}

/**
 * A drink, opened in the card: where it sits, what put it where it stands for
 * you, your last pour of it, what shares its spot, and the two things to do —
 * rate it (in the card) or keep it as your pick.
 */
function DrinkPanel({ e, drink }: { e: ExploreState; drink: Drink }) {
  const region = quadrantFor(drink.x, drink.y);
  const last: PourRecord | undefined = e.lastPour.get(drink.name);
  const lastLine = last
    ? [
        pour.scoreOf(last.rating.hedonic),
        last.isHomePour ? pour.home : last.venue?.entity?.name,
        new Date(last.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;
  const atBar = !!e.venue && e.ranked.some((r) => r.drink.name === drink.name);
  return (
    <div className="pt-1">
      <button type="button" onClick={e.closeDrink} className="link-caps flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {e.venue?.name ?? (e.venue ? compass.atMenu.homeTitle : explore.backToStart)}
      </button>
      <p className="label-caps">
        {region.name} · {formatCoordinate(drink.x, drink.y)}
      </p>
      <h1 className="mt-1 font-serif text-title font-bold leading-tight text-foreground">{e.name(drink.name)}</h1>
      <p className="mt-2 font-serif text-ui italic text-secondary">
        {e.cold ? chart.coldDrinkPrompt : e.reasonFor(drink)}
      </p>

      {lastLine && (
        <dl className="mt-3 border-t border-border pt-1">
          <div className="dot-leader py-1.5">
            <dt className="text-meta text-muted-foreground">{chart.lastPour}</dt>
            <span aria-hidden="true" className="leader" />
            <dd className="font-condensed text-ui font-semibold">{lastLine}</dd>
          </div>
        </dl>
      )}

      {e.sameSpot.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label-caps">{chart.sameSpot}</span>
          {e.sameSpot.map((d) => (
            <button key={d.name} type="button" onClick={() => e.chooseDrink(d.name)} className="chip">
              {e.name(d.name)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {e.cold ? (
          <>
            <a href={questionsHref} className="btn btn-primary px-5">
              {chart.findYours}
            </a>
            <button type="button" onClick={() => e.rate.open({ drink: drink.name })} className="btn btn-outline px-5">
              {chart.logThis}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => e.rate.open({ drink: drink.name })} className="btn btn-primary px-5">
              {chart.logThis}
            </button>
            <button type="button" onClick={() => e.pick(drink.name)} className="btn btn-outline px-5">
              {atBar ? compass.pickAt(e.venue?.name ?? '') : chart.pickThis}
            </button>
          </>
        )}
        {e.register[drink.name] && (
          <a href={`${drinksHref}/${e.register[drink.name].slug}`} className="link-caps text-secondary hover:underline">
            {chart.readEntry} &rarr;
          </a>
        )}
      </div>
    </div>
  );
}

export default function Explore({
  register,
  signInEnabled,
  member,
  initialQuery = '',
  bar,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { did: string; handle: string | null } | null;
  /** `?q=` from the header's search, which works before the island does. */
  initialQuery?: string;
  /** The app bar (`AppBar`, with the search), passed by the page as a slot: the top of the card. */
  bar?: ReactNode;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <ExploreContent register={register} member={member} initialQuery={initialQuery} bar={bar} />
    </AtprotoProvider>
  );
}
