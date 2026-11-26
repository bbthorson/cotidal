import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Drink } from '@/lib/data';
import type { PourRecord } from '@/lib/atproto/records';
import { chart, compass, drinks, explore, mapPage, pour, taste } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { quadrantFor, regionPath } from '@/lib/quadrant';
import { matchDrink } from '@/lib/drink-match';
import { publicMapPath, QUIZ_PARAM, START_OVER_PARAM, startOverPath } from '@/lib/atproto/paths';
import { takeParam } from '@/lib/url-params';
import type { AxisBelief } from '@/lib/belief-state';
import { buildTerrain, sampleTerrain } from '@/lib/terrain';
import { drinksHref, questionsHref } from '@/lib/site-nav';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { useExplore, type Explore as ExploreState } from '@/hooks/useExplore';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { QuizCard } from './QuizCard';
import { MenuView } from './MenuView';
import { NearList } from './Near';
import { MapScreen } from './MapScreen';
import { PalateMap } from './PalateMap';
import { PourLedger } from './PourLedger';
import { RatePanel, type PourMove } from './RatePanel';
import { SearchBox } from './SearchBox';
import { StartOver } from './StartOver';
import { TrackFigure } from './TrackFigure';
import { WaitingPick } from './WaitingPick';
import { Empty, GuestPrompt, Readout, ScreenHeader, SectionTitle } from './ui';
import { DrinkRow } from './DrinkRow';

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
  // How a pour just moved you, while the reveal has the card: the map draws it (`RatePanel`).
  const [moved, setMoved] = useState<PourMove | null>(null);
  const reveal = !!moved;

  // The questions, as a state of the card (`?quiz=1`): asked for on arrival, or by Find your coordinate here.
  // Someone who already has a coordinate goes straight on — to the drink they came from, if any — unless they
  // came to start over (`?startover=1`), which forgets this device's copy first.
  const [quiz, setQuiz] = useState(false);
  const [quizShoal, setQuizShoal] = useState<Record<'x' | 'y', AxisBelief> | null>(null);
  const [quizPoint, setQuizPoint] = useState<{ x: number; y: number } | null>(null);
  // Each answer adds depth: the ground the answers so far make, the questions' own hill (`buildTerrain` with no
  // pours), broad and faint while they are unsure and rising and sharpening as they agree. Kept through the reveal,
  // so the point settles on the hill it made.
  const quizGround = useMemo(
    () =>
      quizShoal
        ? sampleTerrain(
            buildTerrain({ x: quizShoal.x.mean, y: quizShoal.y.mean, variance: { x: quizShoal.x.variance, y: quizShoal.y.variance } }, []),
            1
          )
        : null,
    [quizShoal]
  );
  const startOver = useRef(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const markAnswered = useCallback(() => setQuizAnswered(true), []);
  useEffect(() => {
    const over = takeParam(START_OVER_PARAM);
    if (!takeParam(QUIZ_PARAM) && !over) return;
    startOver.current = over;
    if (over) e.forgetProfile();
    setQuiz(true);
    // Arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A coordinate that arrives while the questions wait (this device's, or a member's account's) answers them.
  useEffect(() => {
    if (quiz && e.profile && !startOver.current && !quizAnswered) setQuiz(false);
  }, [quiz, e.profile, quizAnswered]);
  const closeQuiz = useCallback(() => {
    setQuiz(false);
    setQuizShoal(null);
    setQuizPoint(null);
    setQuizAnswered(false);
    startOver.current = false;
  }, []);

  // A different card starts from its top. On a phone the card is the page's scroll: something about a place on
  // the map (a drink, a bar, back to where to next) scrolls back to the top, so the map shows and pushes the card
  // down; rating scrolls the card up to the top of the screen, where it has the room (`e.up`). From `lg` the card
  // is a panel that scrolls on its own, and starts from its top.
  const cardKey = quiz ? 'quiz' : e.rate.request ? (moved ? 'moved' : 'rate') : e.selectedDrink ? `drink:${e.selected}` : e.venue ? `bar:${e.venue.name ?? ''}` : 'home';
  // The reveal after a pour scrolls back down to the map, which draws the move.
  const cardUp = !moved && (e.up || !!e.rate.request);
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

  const onReveal = useCallback((m: PourMove | null) => setMoved(m), []);
  const closeRate = () => {
    e.rate.close();
    e.setUp(false);
  };

  const ratings = useMemo(() => new Map([...e.lastPour].map(([n, p]) => [n, p.rating.hedonic])), [e.lastPour]);
  const pins = e.venue ? e.ranked.map((r, i) => ({ drink: r.drink, rank: i + 1 })) : null;

  let content;
  if (quiz) {
    content = (
      <QuizCard
        onShoal={setQuizShoal}
        onPoint={setQuizPoint}
        onAnswered={markAnswered}
        onDone={(finished) => {
          e.setProfile(finished);
          closeQuiz();
        }}
        onSkip={closeQuiz}
      />
    );
  } else if (e.rate.request) {
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
    content = <DrinkPanel e={e} drink={e.selectedDrink} onQuiz={() => setQuiz(true)} />;
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
        onQuiz={() => setQuiz(true)}
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

  return (
    <MapScreen
      bar={bar}
      label={explore.cardLabel}
      tone={reveal || quizPoint ? 'reveal' : 'card'}
      rest={quiz ? 'quiz' : 'standard'}
      cardRef={card}
      bodyRef={body}
      map={
        <PalateMap
          ground={quiz ? quizGround : e.ground}
          shoal={quizShoal && !quizPoint ? { x: quizShoal.x.mean, y: quizShoal.y.mean, rx: Math.sqrt(quizShoal.x.variance), ry: Math.sqrt(quizShoal.y.variance) } : null}
          points={
            quizPoint
              ? [{ ...quizPoint, label: chart.youIn(quadrantFor(quizPoint.x, quizPoint.y).name), tone: 'yours' }]
              : moved
                ? [{ ...moved.to, label: chart.youNowIn(quadrantFor(moved.to.x, moved.to.y).name), tone: 'yours' }]
                : undefined
          }
          trail={moved}
          ratings={ratings}
          pins={pins}
          emptyBar={!!e.venue && e.ranked.length === 0}
          selected={moved ? (matchDrink(moved.drinkName)?.name ?? null) : e.selected}
          hover={e.hover}
          onSelect={e.chooseDrink}
          name={e.name}
          caption={
            quiz ? undefined : e.leanings.length > 0 ? (
              <>
                <span className="label-caps">{taste.label} </span>
                <span className="font-serif text-ui italic text-primary">{taste.phrases(e.leanings)}</span>
              </>
            ) : (
              <span className="label-caps">{explore.noPosition}</span>
            )
          }
        />
      }
    >
      {/* The search is the card's first line, but not during the questions, rating or a reveal, which have the card to themselves. */}
      {!quiz && !e.rate.request && !reveal && (
        <div className="pt-3">
          <SearchBox e={e} />
        </div>
      )}
      {content}
    </MapScreen>
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
      {/* From `lg` it is the card's first action, full width, like every card's (docs/design-system.md, rule 10). */}
      <button type="button" onClick={() => e.rate.open()} className="btn btn-primary mt-4 hidden w-full lg:flex">
        {mapPage.rateDrink}
      </button>
      <div>
        <WaitingPick displayName={e.name} version={e.pickVersion} onRate={(draft) => e.rate.open({ drink: draft.drink, draft })} />
      </div>

      <section className="mt-2">
        <SectionTitle aside={compass.menuNote}>{compass.menuTitle}</SectionTitle>
        {e.menu.length === 0 ? (
          <Empty>{compass.noDrinks}</Empty>
        ) : (
          <ol>
            {e.menu.map((d, i) => (
              <DrinkRow
                key={d.name}
                rank={i + 1}
                title={e.name(d.name)}
                note={d.reason}
                selected={e.selected === d.name}
                lead={i === 0}
                onSelect={() => e.chooseDrink(d.name)}
                onHover={(on) => e.setHover(on ? d.name : null)}
              />
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
          <SectionTitle>{compass.yourBars}</SectionTitle>
          <ol>
            {e.barHits.map((b) => (
              <DrinkRow key={b.name} title={b.name} figure={compass.barPours(b.pours)} onSelect={() => e.openBar({ name: b.name })} />
            ))}
          </ol>
        </section>
      )}

      <NearList nearby={e.nearby} onOpen={(b) => e.openBar({ name: b.name, at: { lat: b.lat, lon: b.lon } })} />

      <section id="yours" className="mt-8">
        <SectionTitle>{explore.yoursTitle}</SectionTitle>
        {e.stats.length > 0 && <Readout className="border-t-0" cells={e.stats.map((st) => ({ ...st, figure: true }))} />}
        {e.track && e.track.length > 1 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="label-caps">{mapPage.upClose}</p>
            <TrackFigure track={e.track} />
          </div>
        )}
        {e.history.length > 0 && <SectionTitle as="h3" className="mt-6">{mapPage.ledgerTitle}</SectionTitle>}
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

/**
 * A drink, opened in the card: where it sits, what put it where it stands for
 * you, your last pour of it, what shares its spot, and the two things to do —
 * rate it (in the card) or keep it as your pick.
 */
function DrinkPanel({ e, drink, onQuiz }: { e: ExploreState; drink: Drink; onQuiz: () => void }) {
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
      <ScreenHeader title={e.name(drink.name)} gloss={e.cold ? chart.coldDrinkPrompt : e.reasonFor(drink)}>
        <Readout
          className="mt-4"
          cells={[
            { label: drinks.coordinateLabel, value: formatCoordinate(drink.x, drink.y), figure: true },
            { label: region.axis, value: region.name, href: regionPath(region.id) },
          ]}
        />
      </ScreenHeader>

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

      <div className="mt-4 flex flex-col gap-3">
        {e.cold ? (
          <>
            <a
              href={questionsHref}
              onClick={(ev) => {
                // In place: the drink stays open, and is where the questions finish.
                ev.preventDefault();
                onQuiz();
              }}
              className="btn btn-primary w-full"
            >
              {chart.findYours}
            </a>
            <button type="button" onClick={() => e.rate.open({ drink: drink.name })} className="btn btn-outline w-full">
              {chart.logThis}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => e.rate.open({ drink: drink.name })} className="btn btn-primary w-full">
              {chart.logThis}
            </button>
            <button type="button" onClick={() => e.pick(drink.name)} className="btn btn-outline w-full">
              {atBar ? compass.pickAt(e.venue?.name ?? '') : chart.pickThis}
            </button>
          </>
        )}
        {e.register[drink.name] && (
          <a href={`${drinksHref}/${e.register[drink.name].slug}`} className="link-caps self-start text-secondary hover:underline">
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
