import { useMemo, useRef, type ReactNode } from 'react';
import { chart, compare as compareCopy, explore, mapPage, taste } from '@/lib/copy';
import { quadrantFor, type QuadrantId } from '@/lib/map/coordinates';
import { matchDrink } from '@/lib/drinks/search';
import type { Register } from '@/lib/drinks/register';
import { neutralProfile } from '@/lib/palate/guest-palate';
import type { DrinkEntryData } from '@/lib/drinks/drink-entry';
import type { RegionEntryData } from '@/lib/map/region-entry';
import type { Drink } from '@/lib/drinks/data';
import type { RateRequest } from '@/lib/pours/pour-draft';
import { useExplore, type Venue } from '@/hooks/useExplore';
import { useHomeLists } from '@/hooks/useHomeLists';
import { useOverlays } from '@/hooks/useOverlays';
import { useQuizOverlay } from '@/hooks/useQuizOverlay';
import { useRatePour } from '@/hooks/useRatePour';
import { useCardScroll } from '@/hooks/useCardScroll';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { ColdState } from './ColdState';
import { DrinkPanel } from './DrinkPanel';
import { HomePanel } from './HomePanel';
import { MapScreen } from './MapScreen';
import { MenuView } from './MenuView';
import { OverlayBar } from './OverlayBar';
import { PalateMap } from './PalateMap';
import { QuizCard } from './QuizCard';
import { RatePanel, type PourMove } from './RatePanel';
import { RegionPanel } from './RegionPanel';
import { SearchBox } from './SearchBox';
import { WaitingPick } from './WaitingPick';
import { YourPours } from './YourPours';

type CardMode =
  | { kind: 'quiz'; key: 'quiz' }
  | { kind: 'rate'; key: 'rate' | 'moved'; request: RateRequest }
  | { kind: 'drink'; key: string; drink: Drink }
  | { kind: 'venue'; key: string; venue: Venue }
  | { kind: 'region'; key: string; regionId: QuadrantId }
  | { kind: 'pours'; key: 'pours' }
  | { kind: 'cold'; key: 'home' }
  | { kind: 'home'; key: 'home' };

/**
 * The app, on one screen: your map fixed in place as the background, the
 * search and overlay strip at the top of the card, and one card for everything
 * else. State and rules live in `useExplore`, `useOverlays`, `useQuizOverlay`,
 * and `useCardScroll`; this file resolves the active `CardMode` and composes
 * the map + card.
 */
function ExploreContent({
  register,
  member,
  initialQuery,
  initialEntry,
  initialDrink,
  initialRegion,
  bar,
}: {
  register: Register;
  member: { did: string; handle: string | null } | null;
  initialQuery: string;
  initialEntry: DrinkEntryData | null;
  initialDrink: string | null;
  initialRegion: { id: QuadrantId; entry: RegionEntryData } | null;
  bar?: ReactNode;
}) {
  const e = useExplore(register, member, initialQuery, initialEntry?.name ?? initialDrink, initialRegion?.id ?? null);
  const { isEnabled, openSignIn } = useAtprotoContext();
  const body = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);

  const ratePour = useRatePour({
    request: e.rate.request,
    isMember: e.isMember,
    profile: e.profile,
    setProfile: e.setProfile,
    pours: e.pours,
    start: e.start,
    reload: e.reload,
    barMenuFor: e.barMenuFor,
  });

  // How a pour just moved you, while the reveal has the card: the map draws it.
  const moved: PourMove | null =
    ratePour.reveal && ratePour.lastPour
      ? { from: ratePour.lastPour.from, to: ratePour.to, drinkName: ratePour.lastPour.drinkName }
      : null;
  const reveal = !!moved;

  const quiz = useQuizOverlay(e.profile, e.forgetProfile);
  const ratings = useMemo(() => new Map([...e.lastPour].map(([n, p]) => [n, p.rating.hedonic])), [e.lastPour]);

  const overlays = useOverlays({
    mySide: e.side,
    myGround: e.ground,
    myRated: ratings,
    myLabel: member?.handle ? `@${member.handle}` : compareCopy.you,
  });

  const home = useHomeLists(e, overlays);

  const mode: CardMode = quiz.open
    ? { kind: 'quiz', key: 'quiz' }
    : ratePour.lastPour || e.rate.request
      ? { kind: 'rate', key: moved ? 'moved' : 'rate', request: e.rate.request ?? {} }
      : e.selectedDrink
        ? { kind: 'drink', key: `drink:${e.selected}`, drink: e.selectedDrink }
        : e.venue
          ? { kind: 'venue', key: `bar:${e.venue.name ?? ''}`, venue: e.venue }
          : e.region
            ? { kind: 'region', key: `region:${e.region}`, regionId: e.region }
            : e.poursOpen && !e.cold
              ? { kind: 'pours', key: 'pours' }
              : e.cold
                ? { kind: 'cold', key: 'home' }
                : { kind: 'home', key: 'home' };

  const cardUp = !moved && (e.up || mode.kind === 'rate');
  useCardScroll(mode.key, cardUp, card, body);

  const closeRate = () => {
    const finished = ratePour.lastPour;
    ratePour.reset();
    e.rate.close();
    e.setUp(false);
    if (finished?.bar && !finished.keepPick) {
      e.returnToBar(finished.bar, finished.barMenuBefore, finished.drinkName);
    }
  };

  const pins = e.venue ? e.ranked.map((r, i) => ({ drink: r.drink, rank: i + 1 })) : null;

  let content: ReactNode;
  switch (mode.kind) {
    case 'quiz':
      content = (
        <QuizCard
          onShoal={quiz.setShoal}
          onPoint={quiz.setPoint}
          onAnswered={quiz.markAnswered}
          onDone={(finished) => {
            e.setProfile(finished);
            quiz.closeQuiz();
          }}
          onSkip={quiz.closeQuiz}
        />
      );
      break;
    case 'rate':
      content = (
        <RatePanel
          request={mode.request}
          ratePour={ratePour}
          onClose={closeRate}
          register={register}
          isMember={e.isMember}
          setProfile={e.setProfile}
        />
      );
      break;
    case 'drink':
      content = (
        <DrinkPanel
          drink={mode.drink}
          initialEntry={initialEntry}
          register={e.register}
          name={e.name}
          cold={e.cold}
          side={e.side}
          reason={e.reasonFor(mode.drink)}
          lastPour={e.lastPour.get(mode.drink.name)}
          sameSpot={e.sameSpot}
          venue={e.venue}
          atBar={!!e.venue && e.ranked.some((r) => r.drink.name === mode.drink.name)}
          regionOpen={e.region}
          onClose={e.closeDrink}
          onChooseDrink={e.chooseDrink}
          onRate={(drinkName) =>
            e.rate.open(
              e.barName
                ? { drink: drinkName, draft: { drink: drinkName, bar: e.barName, ...(e.venue?.at ? { at: e.venue.at } : {}) } }
                : { drink: drinkName }
            )
          }
          onPick={e.pick}
          onQuiz={quiz.openQuiz}
        />
      );
      break;
    case 'venue':
      content = (
        <MenuView
          key={mode.venue.name ?? ''}
          venue={mode.venue}
          register={register}
          profile={e.profile}
          isMember={e.isMember}
          signInEnabled={isEnabled}
          onSignIn={openSignIn}
          items={e.items}
          setItems={e.setItems}
          typedBar={e.typedBar}
          setTypedBar={e.setTypedBar}
          ranked={e.ranked}
          barFeedback={e.barFeedback}
          ratings={ratings}
          drinkType={overlays.drinkType}
          reasonFor={e.reasonFor}
          tableMembers={overlays.tableMembers}
          onBack={() => {
            e.leaveBar();
            e.setQuery('');
          }}
          onPick={e.pick}
        />
      );
      break;
    case 'region':
      content = (
        <RegionPanel
          regionId={mode.regionId}
          drinks={e.regionDrinks}
          register={e.register}
          name={e.name}
          initialRegion={initialRegion}
          onOpenRegion={e.openRegion}
          onChooseDrink={e.chooseDrink}
        />
      );
      break;
    case 'pours':
      content = (
        <div className="pb-6 pt-2">
          <button
            type="button"
            onClick={e.closePours}
            className="link-caps mb-2 flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            &larr; {explore.backToStart}
          </button>
          <YourPours
            member={member}
            isMember={e.isMember}
            signInEnabled={isEnabled}
            onSignIn={openSignIn}
            register={e.register}
            pours={e.pours}
            history={e.history}
            track={e.track}
            startLabel={e.startLabel}
            stats={e.stats}
          />
        </div>
      );
      break;
    case 'cold':
      content = (
        <ColdState
          onQuiz={quiz.openQuiz}
          onSignIn={openSignIn}
          onGuest={() => {
            e.setProfile(neutralProfile);
            e.rate.open();
          }}
        />
      );
      break;
    case 'home':
      content = <HomePanel e={e} overlays={overlays} home={home} member={member} />;
      break;
  }

  return (
    <MapScreen
      bar={bar}
      label={explore.cardLabel}
      tone={reveal || quiz.point ? 'reveal' : 'card'}
      rest={quiz.open ? 'quiz' : 'standard'}
      cardRef={card}
      bodyRef={body}
      map={
        <PalateMap
          ground={quiz.open ? quiz.ground : e.ground}
          against={!quiz.open && !reveal ? overlays.againstGround : null}
          shoal={
            quiz.shoal && !quiz.point
              ? { x: quiz.shoal.x.mean, y: quiz.shoal.y.mean, rx: Math.sqrt(quiz.shoal.x.variance), ry: Math.sqrt(quiz.shoal.y.variance) }
              : null
          }
          points={
            quiz.point
              ? [{ ...quiz.point, label: chart.youIn(quadrantFor(quiz.point.x, quiz.point.y).name), tone: 'yours' }]
              : moved
                ? [{ ...moved.to, label: chart.youNowIn(quadrantFor(moved.to.x, moved.to.y).name), tone: 'yours' }]
                : overlays.companionPoints
          }
          trail={moved}
          ratings={ratings}
          pins={pins}
          focus={!quiz.open && !reveal && !e.venue ? (e.searchFocus ?? overlays.focusDrinks ?? e.regionFocus) : null}
          emptyBar={!!e.venue && e.ranked.length === 0}
          selected={moved ? (matchDrink(moved.drinkName)?.name ?? null) : e.selected}
          region={e.region}
          named={quiz.open || reveal || e.venue ? undefined : e.searchFocus ? e.searchShown.map((d) => d.name) : (overlays.comparedNames ?? (e.region ? e.regionShown.map((d) => d.name) : e.cold ? undefined : home.menu.map((d) => d.name)))}
          hover={e.hover}
          onSelect={e.chooseDrink}
          name={e.name}
          caption={
            quiz.open ? undefined : e.leanings.length > 0 ? (
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
      {/* The search sits at the top of the card, except during the questions, rating or a reveal. */}
      {mode.kind !== 'quiz' && mode.kind !== 'rate' && !reveal && (
        <div className="pt-3">
          <SearchBox e={e} />
          {mode.kind === 'home' && (
            <>
              <button type="button" onClick={() => e.rate.open()} className="btn btn-primary mt-3 hidden w-full lg:flex">
                {mapPage.rateDrink}
              </button>
              <WaitingPick
                displayName={e.name}
                version={e.pickVersion}
                submitting={ratePour.submitting}
                error={ratePour.error}
                onQuickRate={(entry, opts) => void ratePour.submit(entry, opts)}
                onOpenDetail={(draft, openDetail) => e.rate.open({ drink: draft.drink, draft, openDetail })}
              />
            </>
          )}
          {(mode.kind === 'home' || mode.kind === 'venue') && <OverlayBar overlays={overlays} e={e} />}
        </div>
      )}
      {content}
    </MapScreen>
  );
}

export default function Explore({
  register,
  signInEnabled,
  member,
  initialQuery = '',
  initialEntry = null,
  initialDrink = null,
  initialRegion = null,
  bar,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { did: string; handle: string | null } | null;
  /** `?q=` from the header's search, which works before the island does. */
  initialQuery?: string;
  /** The write-up of the drink the address opens (`?drink=`), drawn with the page rather than fetched. */
  initialEntry?: DrinkEntryData | null;
  /** The drink the address opens (`?drink=`), so the server draws its card. */
  initialDrink?: string | null;
  /** The region the address narrows the map to (`?region=`), with its write-up, so the server draws its card. */
  initialRegion?: { id: QuadrantId; entry: RegionEntryData } | null;
  /** The app bar (`AppBar`, with the search), passed by the page as a slot: the top of the card. */
  bar?: ReactNode;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <ExploreContent
        register={register}
        member={member}
        initialQuery={initialQuery}
        initialEntry={initialEntry}
        initialDrink={initialDrink}
        initialRegion={initialRegion}
        bar={bar}
      />
    </AtprotoProvider>
  );
}
