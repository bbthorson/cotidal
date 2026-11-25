import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Drink } from '@/lib/data';
import type { PourRecord } from '@/lib/atproto/records';
import { chart, compass, explore, mapPage, pour, taste } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { quadrantFor } from '@/lib/quadrant';
import { fitPlane, type PlaneFit } from '@/lib/map-draw';
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
import { PalateMap } from './PalateMap';
import { PourLedger } from './PourLedger';
import { RatePanel } from './RatePanel';
import { SearchBox } from './SearchBox';
import { StartOver } from './StartOver';
import { TrackFigure } from './TrackFigure';
import { WaitingPick } from './WaitingPick';
import { Empty, GuestPrompt } from './ui';

/** The least a phone's card shows at rest, under the map: its head and a row or two. */
const CARD_REST_MIN = 200;
/** The panel's width from `lg` (`w-96`), and the ground kept around it. */
const PANEL = 384;
const GAP = 16;

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
}: {
  register: Register;
  member: { did: string; handle: string | null } | null;
  initialQuery: string;
}) {
  const e = useExplore(register, member, initialQuery);
  const { isEnabled, openSignIn } = useAtprotoContext();
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, wide: false });
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 1024px)');
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight, wide: wide.matches });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    wide.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      wide.removeEventListener('change', measure);
    };
  }, []);

  // The plane sits where the chrome leaves room, and stays there.
  const { fit, rest } = useMemo((): { fit: PlaneFit | null; rest: number } => {
    const { w, h, wide } = size;
    if (!w || !h) return { fit: null, rest: CARD_REST_MIN };
    if (wide) return { fit: fitPlane({ left: PANEL + 2 * GAP, top: GAP, width: w - PANEL - 3 * GAP, height: h - 2 * GAP }), rest: 0 };
    const side = Math.min(w, Math.max(220, h - CARD_REST_MIN));
    return { fit: fitPlane({ left: 0, top: 0, width: w, height: side }), rest: h - side };
  }, [size]);

  // A different card starts from its top.
  const cardKey = e.rate.request ? 'rate' : e.selectedDrink ? `drink:${e.selected}` : e.venue ? `bar:${e.venue.name ?? ''}` : 'home';
  useEffect(() => {
    body.current?.scrollTo(0, 0);
  }, [cardKey]);

  const onReveal = useCallback((r: boolean) => setReveal(r), []);
  const closeRate = () => {
    e.rate.close();
    e.setUp(false);
  };

  const pins = e.venue ? e.ranked.map((r, i) => ({ drink: r.drink, rank: i + 1 })) : null;

  let content;
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
  }

  const cardHeight = size.wide ? undefined : e.up || e.rate.request ? size.h - 8 : rest;

  return (
    <div ref={root} className="relative min-h-0 flex-1 overflow-hidden">
      <SearchBox e={e} />
      <PalateMap
        fit={fit}
        width={size.w}
        height={size.h}
        ground={e.ground}
        pours={e.lastPour}
        pins={pins}
        emptyBar={!!e.venue && e.ranked.length === 0}
        selected={e.selected}
        hover={e.hover}
        onSelect={e.chooseDrink}
        name={e.name}
      />

      <section
        aria-label={explore.cardLabel}
        style={cardHeight !== undefined ? { height: cardHeight } : undefined}
        className={cn(
          'absolute z-20 flex flex-col border-foreground',
          'inset-x-0 bottom-0 border-t transition-height duration-300 motion-reduce:transition-none',
          'lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-4 lg:w-96 lg:border lg:shadow-mcm lg:transition-none',
          reveal ? 'bg-reveal text-reveal-foreground' : 'bg-card text-foreground'
        )}
      >
        {!reveal && <CardHead e={e} />}
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 lg:px-5">
          {content}
        </div>
      </section>
    </div>
  );
}

/**
 * The card's head: what your map says about you, in the axes' words, and the
 * one handle — dragged up or down on a phone, or tapped (More, Less).
 */
function CardHead({ e }: { e: ExploreState }) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  return (
    <div
      className="shrink-0 cursor-grab touch-none select-none px-4 pt-1.5 lg:cursor-auto lg:px-5 lg:pt-3"
      onPointerDown={(ev) => {
        if ((ev.target as HTMLElement).closest('button')) return;
        drag.current = { y: ev.clientY, moved: false };
        ev.currentTarget.setPointerCapture(ev.pointerId);
      }}
      onPointerMove={(ev) => {
        const d = drag.current;
        if (!d) return;
        if (Math.abs(ev.clientY - d.y) > 24) {
          d.moved = true;
          e.setUp(ev.clientY < d.y);
        }
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) e.setUp(!e.up);
      }}
    >
      <span aria-hidden="true" className="mx-auto mb-2 block h-0.75 w-10 bg-border lg:hidden" />
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <p className="min-w-0 truncate">
          {e.leanings.length > 0 ? (
            <>
              <span className="label-caps">{taste.label} </span>
              <span className="font-serif text-ui italic text-primary">{taste.phrases(e.leanings)}</span>
            </>
          ) : (
            <span className="label-caps">{explore.noPosition}</span>
          )}
        </p>
        <button
          type="button"
          aria-expanded={e.up}
          onClick={() => e.setUp(!e.up)}
          className="link-caps shrink-0 text-secondary lg:hidden"
        >
          {e.up ? explore.less : explore.more}
        </button>
      </div>
    </div>
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
    <div className="pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pb-1">
        <h1 className="font-serif text-title font-bold text-foreground">{explore.heading}</h1>
        <button type="button" onClick={() => e.rate.open()} className="btn btn-primary px-4">
          {mapPage.rateDrink}
        </button>
      </div>
      <div className="mt-3">
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
          <a href={questionsHref} className="btn btn-primary px-5">
            {chart.findYours}
          </a>
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
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { did: string; handle: string | null } | null;
  /** `?q=` from the header's search, which works before the island does. */
  initialQuery?: string;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <ExploreContent register={register} member={member} initialQuery={initialQuery} />
    </AtprotoProvider>
  );
}
