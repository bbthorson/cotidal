import type { PourRecord } from '@/lib/atproto/records';
import type { Drink } from '@/lib/drinks/data';
import { compare as compareCopy, compass, explore, mapPage, overlays as overlayCopy, publicMap } from '@/lib/copy';
import { publicMapPath, startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/drinks/register';
import { TOP } from '@/lib/palate/overlap';
import type { TrackPoint } from '@/lib/palate/track';
import type { RateRequest } from '@/lib/pours/pour-draft';
import type { Venue } from '@/hooks/useExplore';
import type { OverlaysState } from '@/hooks/useOverlays';
import type { useNearby } from '@/hooks/useNearby';
import { Comparison } from './Comparison';
import { DrinkRow } from './DrinkRow';
import { NearList } from './Near';
import { OverlayBar } from './OverlayBar';
import { PourLedger } from './PourLedger';
import { StartOver } from './StartOver';
import { TrackFigure } from './TrackFigure';
import { WaitingPick } from './WaitingPick';
import { Empty, GuestPrompt, Readout, SectionTitle } from './ui';

export interface HomePanelProps {
  member: { did: string; handle: string | null } | null;
  isMember: boolean;
  signInEnabled: boolean;
  onSignIn: () => void;
  register: Register;
  name: (drinkName: string) => string;
  selected: string | null;
  searching: boolean;
  menu: { name: string; reason: string }[];
  reasonFor: (drink: Drink) => string;
  overlays: OverlaysState;
  barHits: { name: string; pours: number }[];
  nearby: ReturnType<typeof useNearby>;
  pours: PourRecord[] | null;
  history: PourRecord[];
  track: TrackPoint[] | null;
  startLabel: string;
  stats: { label: string; value: string }[];
  pickVersion: number;
  onOpenRate: (req?: RateRequest) => void;
  onChooseDrink: (drinkName: string) => void;
  onHoverDrink: (drinkName: string | null) => void;
  onOpenBar: (venue: Venue) => void;
}

/** Where to next: a waiting pick, your menu (or active overlay lens), your bars and bars near you, and your pours. */
export function HomePanel({
  member,
  isMember,
  signInEnabled,
  onSignIn,
  register,
  name,
  selected,
  searching,
  menu,
  reasonFor,
  overlays,
  barHits,
  nearby,
  pours,
  history,
  track,
  startLabel,
  stats,
  pickVersion,
  onOpenRate,
  onChooseDrink,
  onHoverDrink,
  onOpenBar,
}: HomePanelProps) {
  return (
    <div className="pb-20 pt-3 lg:pb-0">
      {/* The card's head says where you are and each section names itself, so the title is for a screen reader alone. */}
      <h1 className="sr-only">{explore.heading}</h1>
      <button type="button" onClick={() => onOpenRate()} className="rate-float btn btn-primary fixed bottom-safe-b right-4 z-30 px-5 shadow-mcm lg:hidden">
        {mapPage.rateDrink}
      </button>
      <button type="button" onClick={() => onOpenRate()} className="btn btn-primary mt-4 hidden w-full lg:flex">
        {mapPage.rateDrink}
      </button>
      <div>
        <WaitingPick displayName={name} version={pickVersion} onRate={(draft) => onOpenRate({ drink: draft.drink, draft })} />
      </div>
      <OverlayBar overlays={overlays} />

      {/* 1-on-1 friend comparison block when `lens === 'with'` */}
      {overlays.lens === 'with' && overlays.comparison && overlays.companions[0] && (
        <section className="mt-4" data-testid="overlay-with-comparison">
          <Comparison
            comparison={overlays.comparison}
            whose={compareCopy.yours}
            who={compareCopy.you}
            other={`@${overlays.companions[0].handle}`}
            pair={(drink) => ({ title: name(drink.name) })}
            name={name}
          />
        </section>
      )}

      {/* Main ranked section: adapts to active Lens (`self`, `with`, `table`, `explore`) and Scope (`drinkType`) */}
      {overlays.lens === 'table' || overlays.lens === 'with' ? (
        <section className="mt-4" data-testid="overlay-table-picks">
          <SectionTitle aside={overlayCopy.tableNote}>
            {overlayCopy.tableTitle(overlays.tableMembers.length)}
          </SectionTitle>
          {overlays.tableContrast && (
            <Readout
              className="border-t-0"
              cells={[
                {
                  label: overlayCopy.tableContrast,
                  value: `${overlays.tableContrast.first} · ${overlays.tableContrast.second}`,
                },
                {
                  label: publicMap.betweenLabel(overlays.tableContrast.first, overlays.tableContrast.second),
                  value: publicMap.inCommon(overlays.tableContrast.inCommon, TOP),
                },
              ]}
            />
          )}
          {overlays.tablePicks.length === 0 ? (
            <Empty>{overlayCopy.tableEmpty}</Empty>
          ) : (
            <ol>
              {overlays.tablePicks.map((d, i) => (
                <DrinkRow
                  key={d.name}
                  rank={i + 1}
                  title={name(d.name)}
                  note={reasonFor(d)}
                  selected={selected === d.name}
                  lead={i === 0}
                  onSelect={() => onChooseDrink(d.name)}
                  onHover={(on) => onHoverDrink(on ? d.name : null)}
                />
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => onOpenBar({ name: null })}
            className="link-caps mt-2 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
          >
            {compass.haveMenu} &rarr;
          </button>
        </section>
      ) : overlays.lens === 'explore' && overlays.frontier ? (
        <div className="mt-4 space-y-6" data-testid="overlay-explore-lists">
          <section>
            <SectionTitle aside={overlayCopy.exploreNearNote}>{overlayCopy.exploreNearTitle}</SectionTitle>
            {overlays.frontier.nearUntried.length === 0 ? (
              <Empty>{overlayCopy.exploreEmpty}</Empty>
            ) : (
              <ol>
                {overlays.frontier.nearUntried.map((d, i) => (
                  <DrinkRow
                    key={d.name}
                    rank={i + 1}
                    title={name(d.name)}
                    note={reasonFor(d)}
                    selected={selected === d.name}
                    lead={i === 0}
                    onSelect={() => onChooseDrink(d.name)}
                    onHover={(on) => onHoverDrink(on ? d.name : null)}
                  />
                ))}
              </ol>
            )}
          </section>
          {overlays.frontier.pastEdge.length > 0 && (
            <section>
              <SectionTitle aside={overlayCopy.exploreEdgeNote}>{overlayCopy.exploreEdgeTitle}</SectionTitle>
              <ol>
                {overlays.frontier.pastEdge.map((d, i) => (
                  <DrinkRow
                    key={d.name}
                    rank={i + 1}
                    title={name(d.name)}
                    note={reasonFor(d)}
                    selected={selected === d.name}
                    onSelect={() => onChooseDrink(d.name)}
                    onHover={(on) => onHoverDrink(on ? d.name : null)}
                  />
                ))}
              </ol>
            </section>
          )}
        </div>
      ) : (
        <section className="mt-2">
          <SectionTitle aside={compass.menuNote}>
            {overlays.drinkType ? `${compass.menuTitle} · ${overlayCopy.types[overlays.drinkType]}` : compass.menuTitle}
          </SectionTitle>
          {menu.length === 0 ? (
            <Empty>{compass.noDrinks}</Empty>
          ) : (
            <ol>
              {menu.map((d, i) => (
                <DrinkRow
                  key={d.name}
                  rank={i + 1}
                  title={name(d.name)}
                  note={d.reason}
                  selected={selected === d.name}
                  lead={i === 0}
                  onSelect={() => onChooseDrink(d.name)}
                  onHover={(on) => onHoverDrink(on ? d.name : null)}
                />
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => onOpenBar({ name: null })}
            className="link-caps mt-2 flex min-h-11 items-center text-secondary hover:underline hover:underline-offset-4"
          >
            {compass.haveMenu} &rarr;
          </button>
        </section>
      )}

      {barHits.length > 0 && !searching && (
        <section className="mt-6">
          <SectionTitle>{compass.yourBars}</SectionTitle>
          <ol>
            {barHits.map((b) => (
              <DrinkRow key={b.name} title={b.name} figure={compass.barPours(b.pours)} onSelect={() => onOpenBar({ name: b.name })} />
            ))}
          </ol>
        </section>
      )}

      <NearList nearby={nearby} onOpen={(b) => onOpenBar({ name: b.name, at: { lat: b.lat, lon: b.lon } })} />

      <section id="yours" className="mt-8">
        <SectionTitle>{explore.yoursTitle}</SectionTitle>
        {stats.length > 0 && <Readout className="border-t-0" cells={stats.map((st) => ({ ...st, figure: true }))} />}
        {track && track.length > 1 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="label-caps">{mapPage.upClose}</p>
            <TrackFigure track={track} />
          </div>
        )}
        {history.length > 0 && <SectionTitle as="h3" className="mt-6">{mapPage.ledgerTitle}</SectionTitle>}
        <PourLedger
          pours={history}
          register={register}
          empty={mapPage.ledgerEmpty}
          loading={pours === null}
          track={track}
          startLabel={startLabel}
        />
        {member && (
          <a href={`${publicMapPath(member.handle ?? member.did)}#compare`} className="link-caps mt-6 flex text-secondary hover:underline hover:underline-offset-4">
            {mapPage.compareLink} &rarr;
          </a>
        )}
        {!isMember && signInEnabled && history.length > 0 && (
          <GuestPrompt className="mt-8" title={mapPage.guestTitle} body={mapPage.guestBody} onSignIn={onSignIn} />
        )}
        {!isMember && <StartOver onConfirm={() => window.location.assign(startOverPath)} flush={signInEnabled && history.length > 0} />}
      </section>
    </div>
  );
}
