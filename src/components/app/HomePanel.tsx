import type { ReactNode } from 'react';
import { compare as compareCopy, compass, explore, mapPage, overlays as overlayCopy, publicMap } from '@/lib/copy';
import { TOP } from '@/lib/palate/overlap';
import type { Explore } from '@/hooks/useExplore';
import type { HomeList, HomeLists } from '@/hooks/useHomeLists';
import type { OverlaysState } from '@/hooks/useOverlays';
import { Comparison } from './Comparison';
import { DrinkRow } from './DrinkRow';
import { NearList } from './Near';
import { OverlayBar } from './OverlayBar';
import { RankedList } from './RankedList';
import { WaitingPick } from './WaitingPick';
import { YourPours } from './YourPours';
import { Readout, SectionTitle } from './ui';

/**
 * Where to next: Rate a drink, a waiting pick, the overlay strip, the ranked
 * lists it chooses (`useHomeLists`), your bars, bars near you, and your pours.
 */
export function HomePanel({
  e,
  overlays,
  home,
  member,
  signInEnabled,
  onSignIn,
}: {
  e: Explore;
  overlays: OverlaysState;
  home: HomeLists;
  member: { did: string; handle: string | null } | null;
  signInEnabled: boolean;
  onSignIn: () => void;
}) {
  const openRate = () => e.rate.open();
  const haveMenu = (
    <button
      type="button"
      onClick={() => e.openBar({ name: null })}
      className="link-caps mt-2 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
    >
      {compass.haveMenu} &rarr;
    </button>
  );
  const list = (l: HomeList, after?: ReactNode) => (
    <>
      <SectionTitle aside={l.aside}>{l.title}</SectionTitle>
      {after}
      <RankedList drinks={l.drinks} name={e.name} selected={e.selected} lead={l.lead} empty={l.empty} onChoose={e.chooseDrink} onHover={e.setHover} />
    </>
  );
  const contrast = overlays.tableContrast;

  return (
    <div className="pb-20 pt-3 lg:pb-0">
      {/* The card's head says where you are and each section names itself, so the title is for a screen reader alone. */}
      <h1 className="sr-only">{explore.heading}</h1>
      <button type="button" onClick={openRate} className="rate-float btn btn-primary fixed bottom-safe-b right-4 z-30 px-5 shadow-mcm lg:hidden">
        {mapPage.rateDrink}
      </button>
      <button type="button" onClick={openRate} className="btn btn-primary mt-4 hidden w-full lg:flex">
        {mapPage.rateDrink}
      </button>
      <div>
        <WaitingPick displayName={e.name} version={e.pickVersion} onRate={(draft) => e.rate.open({ drink: draft.drink, draft })} />
      </div>
      <OverlayBar overlays={overlays} />

      {overlays.lens === 'with' && overlays.comparison && overlays.companions[0] && (
        <section className="mt-4" data-testid="overlay-with-comparison">
          <Comparison
            comparison={overlays.comparison}
            whose={compareCopy.yours}
            who={compareCopy.you}
            other={`@${overlays.companions[0].handle}`}
            pair={(drink) => ({ title: e.name(drink.name) })}
            name={e.name}
          />
        </section>
      )}

      {home.kind === 'table' ? (
        <section className="mt-4" data-testid="overlay-table-picks">
          {list(
            home.lists[0],
            contrast && (
              <Readout
                className="border-t-0"
                cells={[
                  { label: overlayCopy.tableContrast, value: `${contrast.first} · ${contrast.second}` },
                  { label: publicMap.betweenLabel(contrast.first, contrast.second), value: publicMap.inCommon(contrast.inCommon, TOP) },
                ]}
              />
            )
          )}
          {haveMenu}
        </section>
      ) : home.kind === 'explore' ? (
        <div className="mt-4 space-y-6" data-testid="overlay-explore-lists">
          {home.lists.map((l) => (
            <section key={l.title}>{list(l)}</section>
          ))}
        </div>
      ) : (
        <section className="mt-2">
          {list(home.lists[0])}
          {haveMenu}
        </section>
      )}

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

      <NearList nearby={e.nearby} onOpen={(b) => e.openBar({ name: b.name, at: { lat: b.lat, lon: b.lon }, osmId: b.id })} />

      <YourPours
        member={member}
        isMember={e.isMember}
        signInEnabled={signInEnabled}
        onSignIn={onSignIn}
        register={e.register}
        pours={e.pours}
        history={e.history}
        track={e.track}
        startLabel={e.startLabel}
        stats={e.stats}
      />
    </div>
  );
}
