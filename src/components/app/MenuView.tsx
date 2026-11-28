import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { addMenuLine, addMenuLines, type MenuItem, type RankedDrink } from '@/lib/drinks/menu-rank';
import { summarizeCoverage } from '@/lib/drinks/menu-audit';
import { chart, compass, explore, menu, overlays as overlayCopy, venuePage } from '@/lib/copy';
import { osmPlaceHref } from '@/lib/drinks/osm';
import { titleOf, type Register } from '@/lib/drinks/register';
import type { UserProfile } from '@/lib/palate/profile';
import { rankForTable, type TableMember } from '@/lib/palate/overlays';
import type { Venue } from '@/hooks/useExplore';
import { useMenuCapture } from '@/hooks/useMenuCapture';
import { questionsHref } from '@/lib/site-nav';
import { MenuEntry } from './MenuEntry';
import { MenuLines } from './MenuLines';
import { RankedList } from './RankedList';
import { Empty, Readout, ScreenHeader, SectionTitle } from './ui';

/**
 * A bar open on the map, in the card: a bar's menu, or one with no bar. Type,
 * paste or photograph what they pour (`MenuEntry`); each line is matched to
 * the map (`MenuLines`) and each placed drink becomes a numbered pin on your
 * map, ranked for you (`rankMenu`, or `rankForTable` when a friend or table
 * overlay is on); pick one.
 */
export function MenuView({
  venue,
  register,
  profile,
  isMember = false,
  signInEnabled = false,
  onSignIn,
  items,
  setItems,
  typedBar,
  setTypedBar,
  ranked,
  reasonFor,
  tableMembers,
  onBack,
  onPick,
}: {
  venue: Venue;
  register: Register;
  profile: UserProfile | null;
  isMember?: boolean;
  signInEnabled?: boolean;
  onSignIn?: () => void;
  items: MenuItem[];
  setItems: Dispatch<SetStateAction<MenuItem[]>>;
  /** A menu with no bar to start from can still say which bar it is. */
  typedBar: string;
  setTypedBar: (name: string) => void;
  /** The menu's placed drinks, ranked: the pins on the map, numbered the same. */
  ranked: RankedDrink[];
  reasonFor: (drink: RankedDrink['drink']) => string;
  /** When a friend/table overlay is active, rank this bar's placed drinks for the group. */
  tableMembers?: TableMember[];
  onBack: () => void;
  onPick: (drinkName: string) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const capture = useMenuCapture(isMember, register, setItems);

  const bar = (venue.name ?? typedBar).trim() || null;
  const isGroup = !!tableMembers && tableMembers.length >= 2;
  const displayRanked = useMemo(() => {
    if (!isGroup || !tableMembers) return ranked.map((r) => r.drink);
    return rankForTable(
      tableMembers,
      ranked.map((r) => r.drink)
    );
  }, [isGroup, tableMembers, ranked]);
  const footprint = useMemo(() => summarizeCoverage(items), [items]);
  const chosen = choice ?? displayRanked[0]?.name;

  const placeHref = venue.osmId ? osmPlaceHref(venue.osmId) : null;

  return (
    <div className="pb-6 motion-safe:animate-in motion-safe:fade-in">
      <button type="button" onClick={onBack} className="link-caps mb-2 flex min-h-11 items-center text-muted-foreground hover:text-foreground">
        &larr; {explore.backToStart}
      </button>
      <ScreenHeader
        title={venue.name ?? compass.atMenu.homeTitle}
        lede={compass.atMenu.body}
      />
      {placeHref && (
        <a
          href={placeHref}
          className="link-caps mt-2 inline-block text-secondary hover:underline hover:underline-offset-4"
        >
          {venuePage.placePageLabel} &rarr;
        </a>
      )}

      {!profile ? (
        // Without a coordinate there is nothing to rank against: say what it needs.
        <Empty
          action={
            <a href={questionsHref} className="btn btn-primary w-full px-6">
              {compass.findYours}
            </a>
          }
        >
          {menu.coldBody}
        </Empty>
      ) : (
        <>
          {venue.name === null && (
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="label-caps">{compass.atMenu.barLabel}</span>
              <input
                value={typedBar}
                onChange={(e) => setTypedBar(e.target.value)}
                maxLength={200}
                autoComplete="off"
                className="field min-h-11"
              />
            </label>
          )}

          <MenuEntry
            register={register}
            capture={capture}
            signInEnabled={signInEnabled}
            onSignIn={onSignIn}
            onAddLine={(line) => setItems((prev) => addMenuLine(prev, line, register))}
            onAddLines={(text) => setItems((prev) => addMenuLines(prev, text, register))}
          />

          <MenuLines items={items} register={register} profile={profile} onRemove={(item) => setItems((prev) => prev.filter((i) => i !== item))} />

          {footprint.placedCount >= 2 && (
            <section className="mt-6" data-testid="bar-footprint">
              <SectionTitle
                aside={
                  footprint.blindSpots.length > 0
                    ? overlayCopy.footprintBlindSpots(footprint.blindSpots.map((b) => b.name))
                    : overlayCopy.footprintBalanced
                }
              >
                {overlayCopy.footprintTitle}
              </SectionTitle>
              <Readout
                className="border-t-0"
                cells={footprint.coverage
                  .filter((c) => c.count > 0)
                  .map((c) => ({ label: c.name, value: `${c.count} (${c.percent}%)`, figure: true }))}
              />
            </section>
          )}

          {displayRanked.length > 0 && (
            <section className="mt-6">
              <SectionTitle aside={isGroup && tableMembers ? overlayCopy.groupMenuNote(tableMembers.length) : undefined}>
                {bar ? compass.atMenu.rankedAt(bar) : compass.atMenu.rankedHome}
              </SectionTitle>
              <p className="mt-2 text-meta text-muted-foreground">{compass.atMenu.rankedBody}</p>
              <RankedList
                drinks={displayRanked.map((drink) => ({ name: drink.name, note: reasonFor(drink) }))}
                name={(n) => titleOf(register, n)}
                selected={chosen}
                onChoose={setChoice}
              />
              <button type="button" onClick={() => chosen && onPick(chosen)} className="btn btn-primary mt-6 w-full">
                {chart.pickThis}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
