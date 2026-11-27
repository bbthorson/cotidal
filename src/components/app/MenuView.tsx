import { useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { drinkDatabase } from '@/lib/drinks/data';
import { addMenuLine, addMenuLines, type MenuItem, type RankedDrink } from '@/lib/drinks/menu-rank';
import { summarizeCoverage } from '@/lib/drinks/menu-audit';
import { clashingAversions } from '@/lib/drinks/ingredient-match';
import { captureMenu, type CaptureMenuResponse } from '@/lib/api-client';
import { chart, compass, explore, mcp, menu, overlays as overlayCopy, venuePage } from '@/lib/copy';
import { osmPlaceHref } from '@/lib/drinks/osm';
import { titleOf, type Register } from '@/lib/drinks/register';
import type { UserProfile } from '@/lib/palate/profile';
import { rankForTable, type TableMember } from '@/lib/palate/overlays';
import { quadrantFor, type QuadrantId } from '@/lib/map/coordinates';
import type { Venue } from '@/hooks/useExplore';
import { questionsHref } from '@/lib/site-nav';
import { cn } from '@/lib/utils';
import { DrinkRow } from './DrinkRow';
import { Empty, Readout, ScreenHeader, SectionTitle } from './ui';

/**
 * A bar open on the map, in the card: a bar's menu, or one with no bar. Type
 * or paste what they pour (each line is matched to the map, `addMenuLine` /
 * `addMenuLines`) and each placed drink becomes a numbered pin on your map,
 * ranked for you (`rankMenu`, or `rankForTable` when a friend/table overlay is
 * active); pick one. Unplaced house cocktails still warn on avoided flavours
 * and hint at close classics when ingredients are present.
 */
/** Compress a selected menu image to <= 1600px JPEG base64 for fast upload. */
async function compressImageFile(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    return base64 ? { base64, mimeType: 'image/jpeg' } : null;
  } catch {
    return null;
  }
}

/** Merge any Clef directional enrichments from `/api/menu/capture` onto parsed `MenuItem`s. */
function mergeCapturedItems(
  prev: MenuItem[],
  res: CaptureMenuResponse,
  register: Register
): MenuItem[] {
  const base = addMenuLines(prev, res.lines.join('\n'), register);
  const byLabel = new Map(res.items.map((i) => [i.label.toLowerCase(), i]));
  return base.map((item) => {
    if (item.drink || item.directional) return item;
    const captured = byLabel.get(item.label.toLowerCase());
    if (!captured?.directional) return item;
    const closest = captured.directional.closestClassicName
      ? drinkDatabase.find((d) => d.name === captured.directional!.closestClassicName) ?? null
      : null;
    return {
      ...item,
      directional: {
        x: captured.directional.x,
        y: captured.directional.y,
        quadrant: captured.directional.quadrant as QuadrantId,
        confidence: captured.directional.confidence,
        primitives: [],
        aversions: captured.directional.aversions,
        closestClassic: closest,
      },
      ...(closest ? { relative: closest } : {}),
    };
  });
}

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
  const [entry, setEntry] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const aversions = useMemo(
    () => ({
      smoke: profile?.dislikesSmoke ?? false,
      bitter: profile?.dislikesBitter ?? false,
      anise: profile?.dislikesAnise ?? false,
    }),
    [profile]
  );

  const add = () => {
    setItems((prev) => addMenuLine(prev, entry, register));
    setEntry('');
  };

  const addBulk = () => {
    setItems((prev) => addMenuLines(prev, pasteText, register));
    setPasteText('');
    setPasting(false);
  };

  const onPhotoButtonClick = () => {
    setPhotoMessage(null);
    if (!isMember) {
      setShowSignInNudge(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const onPhotoSelected = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setScanning(true);
    setPhotoMessage(null);
    const compressed = await compressImageFile(file);
    if (!compressed) {
      setScanning(false);
      setPhotoMessage(compass.atMenu.photoEmpty);
      return;
    }
    const res = await captureMenu({ image: compressed.base64, mimeType: compressed.mimeType });
    setScanning(false);
    if (!res) {
      setPhotoMessage(compass.atMenu.photoEmpty);
      return;
    }
    if (res.requiresSignIn) {
      setShowSignInNudge(true);
      return;
    }
    if (res.outcome === 'rate-limited') {
      setPhotoMessage(compass.atMenu.photoRateLimited);
      return;
    }
    if (res.lines.length === 0) {
      setPhotoMessage(compass.atMenu.photoEmpty);
      return;
    }
    setItems((prev) => mergeCapturedItems(prev, res, register));
  };

  const pick = () => {
    if (chosen) onPick(chosen);
  };

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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="label-caps">{compass.atMenu.addLabel}</span>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                list="menu-drinks"
                placeholder={compass.atMenu.addPlaceholder}
                maxLength={200}
                autoComplete="off"
                className="field min-h-11"
              />
            </label>
            <button type="submit" className="btn btn-outline self-end px-4">
              {compass.atMenu.add}
            </button>
            <datalist id="menu-drinks">
              {drinkDatabase.map((d) => (
                <option key={d.name} value={titleOf(register, d.name)} />
              ))}
            </datalist>
          </form>

          {!pasting ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => setPasting(true)}
                aria-expanded={false}
                className="link-caps text-secondary hover:underline hover:underline-offset-4"
              >
                {/* "+": it opens here. "→" is for what goes somewhere ("Have a menu? →"). */}
                {compass.atMenu.pasteToggle} +
              </button>
              <button
                type="button"
                disabled={scanning}
                onClick={onPhotoButtonClick}
                data-testid="menu-scan-photo"
                className="link-caps text-secondary hover:underline hover:underline-offset-4 disabled:opacity-50"
              >
                {scanning ? compass.atMenu.scanningPhoto : compass.atMenu.scanPhoto}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoSelected}
                className="sr-only"
                aria-label={compass.atMenu.scanPhoto}
              />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addBulk();
              }}
              className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
            >
              <label className="flex flex-col gap-1.5">
                <span className="label-caps">{compass.atMenu.pasteLabel}</span>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={compass.atMenu.pastePlaceholder}
                  rows={5}
                  className="field py-2.5"
                />
              </label>
              <div className="flex items-center gap-4">
                <button type="submit" className="btn btn-outline px-4">
                  {compass.atMenu.pasteAdd}
                </button>
                <button
                  type="button"
                  onClick={() => setPasting(false)}
                  className="link-caps text-muted-foreground hover:text-foreground"
                >
                  {compass.atMenu.pasteCancel}
                </button>
              </div>
            </form>
          )}

          {showSignInNudge && !isMember && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3" data-testid="photo-signin-nudge">
              <p className="text-meta text-muted-foreground">{compass.atMenu.photoSignInNudge}</p>
              {signInEnabled && onSignIn && (
                <button type="button" onClick={onSignIn} className="btn btn-outline px-3">
                  {compass.atMenu.photoSignInAction}
                </button>
              )}
            </div>
          )}

          {photoMessage && (
            <p className="mt-3 text-meta text-primary" role="status">
              {photoMessage}
            </p>
          )}

          {items.length > 0 && (
            <ul className="mt-4 border-t border-foreground">
              {items.map((item) => {
                const clashes = !item.drink
                  ? clashingAversions(`${item.label} ${item.description ?? ''}`, aversions).map((k) => mcp.flavours[k])
                  : [];
                return (
                  <li key={item.label} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
                    <div className="mr-auto min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="font-serif text-prose font-bold text-foreground">{item.label}</span>
                        <span className={cn('text-meta', item.drink ? 'text-secondary' : 'text-muted-foreground')}>
                          {item.drink
                            ? compass.atMenu.placed
                            : item.directional
                              ? compass.atMenu.directional(quadrantFor(item.directional.x, item.directional.y).name)
                              : compass.atMenu.unplaced}
                        </span>
                        {item.relative && (
                          <span className="text-meta text-muted-foreground">
                            {compass.atMenu.nearClassic(titleOf(register, item.relative.name))}
                          </span>
                        )}
                        {clashes.length > 0 && (
                          <span className="text-meta font-semibold text-primary">
                            {compass.atMenu.clashes(clashes)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="truncate text-meta text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={compass.atMenu.remove(item.label)}
                      onClick={() => setItems((prev) => prev.filter((i) => i !== item))}
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-foreground"
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

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
              <ol>
                {displayRanked.map((drink, i) => (
                  <DrinkRow
                    key={drink.name}
                    rank={i + 1}
                    title={titleOf(register, drink.name)}
                    note={reasonFor(drink)}
                    selected={chosen === drink.name}
                    onSelect={() => setChoice(drink.name)}
                  />
                ))}
              </ol>
              <button type="button" onClick={pick} className="btn btn-primary mt-6 w-full">
                {chart.pickThis}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
