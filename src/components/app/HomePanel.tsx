import type { ReactNode } from 'react';
import { compare as compareCopy, compass, explore, mapPage, overlays as overlayCopy, publicMap } from '@/lib/copy';
import { publicMapPath } from '@/lib/atproto/paths';
import { TOP } from '@/lib/palate/overlap';
import type { Explore } from '@/hooks/useExplore';
import type { HomeList, HomeLists } from '@/hooks/useHomeLists';
import type { OverlaysState } from '@/hooks/useOverlays';
import { Comparison } from './Comparison';
import { RankedList } from './RankedList';
import { Readout, SectionTitle } from './ui';

/**
 * Where to next: Rate a drink, the ranked lists chosen by the chip row
 * (`useHomeLists`: Again & New, the table's picks, or Uncharted), and a quiet
 * link to Your pours (at the head of a member's own link, or in the card for a
 * guest). Your bars and Bars near you live in the Where chip picker.
 */
export function HomePanel({
  e,
  overlays,
  home,
  member,
}: {
  e: Explore;
  overlays: OverlaysState;
  home: HomeLists;
  member: { did: string; handle: string | null } | null;
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
        <div className="mt-4 space-y-6">
          {home.lists.map((l) => (
            <section key={l.title}>{list(l)}</section>
          ))}
          {haveMenu}
        </div>
      )}

      <div className="mt-6 border-t border-border pt-2">
        {member ? (
          <a
            href={`${publicMapPath(member.handle ?? member.did)}#yours`}
            data-testid="open-your-pours"
            className="link-caps flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            {explore.yoursTitle} &rarr;
          </a>
        ) : (
          <button
            type="button"
            onClick={e.openPours}
            data-testid="open-your-pours"
            className="link-caps flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            {explore.yoursTitle} &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
