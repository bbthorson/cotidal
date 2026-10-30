import { useEffect, useMemo, useState } from 'react';
import { drinkDatabase, type Drink } from '@/lib/data';
import { calculateWeightedRelevance, type MinimalDrinkLog } from '@/lib/scoring';
import { chart, harbour } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { usePours } from '@/hooks/usePours';
import { questionsHref } from '@/lib/site-nav';
import { loadProfile, savePick, type DrinkPick } from '@/lib/device-store';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { draftPath } from '@/lib/pour-draft';
import { geoLocation } from '@/lib/atproto/location';
import { recentBarNames } from '@/lib/pour-history';
import { cn } from '@/lib/utils';
import { AtprotoProvider } from './AtprotoProvider';
import { DrinkRow } from './Chart';

type Step = 'where' | 'menu' | 'pick' | 'picked';
const STEPS: Step[] = ['where', 'menu', 'pick'];

interface MenuItem {
  /** As typed, or the register's title when it was picked from the map. */
  label: string;
  drink: Drink | null;
}

const drinkKey = (s: string) => s.trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');

/** The drink on the map a menu line names, by catalogue name or register title. */
function placeDrink(label: string, register: Register): Drink | null {
  const want = drinkKey(label);
  if (!want) return null;
  return (
    drinkDatabase.find((d) => drinkKey(d.name) === want || drinkKey(register[d.name]?.title ?? '') === want) ?? null
  );
}

/**
 * The harbour: at a bar, deciding what to have. It is composed in steps,
 * like a post — where you are, what they pour, which to have — and ends with
 * the pick kept as a draft on the device. It does not order anything: it
 * helps choose, and remembers to ask for the rating. Rating it opens /log on the draft
 * (`draftPath`), the same hand-off a chat assistant uses, so the rating is
 * still the member's own tap.
 */
function HarbourContent({ register, member }: { register: Register; member: boolean }) {
  // Read after mount: the server has no device, and its "no coordinate" must
  // not flash at someone who has one.
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [step, setStep] = useState<Step>('where');
  const [bar, setBar] = useState('');
  // Where the bar is, from the map; it belongs to that name only, so typing another drops it.
  const [barAt, setBarAt] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [atHome, setAtHome] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [entry, setEntry] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [pick, setPick] = useState<DrinkPick | null>(null);
  const { pours: poured } = usePours(member);
  const pours = useMemo(() => poured ?? [], [poured]);

  useEffect(() => setProfile(loadProfile()), []);

  // From a bar on Compass (`harbourAt`): already there, so straight to its menu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('bar')?.trim().slice(0, 200);
    if (!name) return;
    setBar(name);
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    if (params.has('lat') && geoLocation(lat, lon)) setBarAt({ name, lat, lon });
    setStep('menu');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const recentBars = useMemo(() => recentBarNames(pours, 5), [pours]);

  const ranked = useMemo(() => {
    if (!profile) return [];
    const logs: MinimalDrinkLog[] = pours.map((p) => ({
      drinkName: p.drink.name,
      location: p.isHomePour ? 'Home Pour' : p.venue?.entity?.name,
      hedonicScale: p.rating.hedonic,
      createdAt: p.createdAt,
    }));
    const placed = [...new Map(items.filter((i) => i.drink).map((i) => [i.drink!.name, i.drink!])).values()];
    return placed
      .map((drink) => ({
        drink,
        score: calculateWeightedRelevance(
          { x: profile.x, y: profile.y, vibeTags: profile.vibeTags },
          drink,
          logs,
          atHome ? 'Home Pour' : bar.trim() || null
        ),
      }))
      .sort((a, b) => b.score - a.score);
  }, [profile, pours, items, bar, atHome]);

  const unplaced = items.filter((i) => !i.drink);
  const where = atHome ? null : bar.trim();

  const add = () => {
    const label = entry.trim();
    if (!label) return;
    const drink = placeDrink(label, register);
    const shown = drink ? titleOf(register, drink.name) : label;
    setItems((prev) => (prev.some((i) => drinkKey(i.label) === drinkKey(shown)) ? prev : [...prev, { label: shown, drink }]));
    setEntry('');
  };

  const placePick = () => {
    const drinkName = choice ?? ranked[0]?.drink.name;
    if (!drinkName) return;
    const next: DrinkPick = {
      drink: drinkName,
      ...(atHome ? { atHome: true } : where ? { bar: where } : {}),
      ...(!atHome && barAt && barAt.name === where ? { at: { lat: barAt.lat, lon: barAt.lon } } : {}),
      pickedAt: new Date().toISOString(),
    };
    savePick(next);
    setPick(next);
    setStep('picked');
  };

  if (profile === undefined) return <div className="min-h-screen" />;

  // The harbour ranks against a coordinate; without one there is nothing to rank against.
  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <span className="label-caps text-secondary">{harbour.title}</span>
        <h1 className="mt-3 font-serif text-title font-bold text-foreground">{harbour.coldTitle}</h1>
        <p className="mt-3 font-serif text-prose text-muted-foreground">{harbour.coldBody}</p>
        <a href={questionsHref} className="btn btn-primary btn-lg mt-8 w-full px-6">
          {harbour.coldCta}
        </a>
      </div>
    );
  }

  if (step === 'picked' && pick) {
    const title = titleOf(register, pick.drink);
    return (
      <div className="mx-auto max-w-xl py-8 motion-safe:animate-in motion-safe:fade-in">
        <div className="flex flex-col gap-2.5 border border-foreground bg-card p-4.5 shadow-mcm">
          <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
            {harbour.pickedEyebrow} · {pick.atHome ? harbour.atHome : pick.bar}
          </span>
          <h1 className="font-serif text-title font-bold text-foreground">{title}</h1>
          <span className="font-condensed text-xs uppercase tracking-label text-muted-foreground">
            {new Date(pick.pickedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <p className="mt-5 text-ui text-muted-foreground">{harbour.pickedBody}</p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={draftPath({ drink: pick.drink, atHome: pick.atHome, bar: pick.bar, at: pick.at })}
            className="btn btn-primary btn-lg w-full px-6"
          >
            {harbour.rateNow}
          </a>
          <a href="/compass" className="btn btn-outline w-full px-6">
            {harbour.rateLater}
          </a>
        </div>
      </div>
    );
  }

  const index = STEPS.indexOf(step);
  const canNext = step === 'where' ? atHome || bar.trim().length > 0 : step === 'menu' ? ranked.length > 0 : true;

  return (
    <div className="mx-auto flex max-w-xl flex-col py-5 lg:py-8">
      {/* Where you are in the composition: three ruled cells, the way a form numbers its parts. */}
      <ol aria-label={harbour.title} className="grid grid-cols-3 border border-foreground">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? 'step' : undefined}
            className={cn(
              'flex min-h-9 items-center justify-center gap-1.5 font-condensed text-xs uppercase tracking-label',
              i > 0 && 'border-l border-foreground',
              s === step
                ? 'bg-secondary font-bold text-secondary-foreground'
                : i < index
                  ? 'bg-card font-semibold text-foreground'
                  : 'bg-card text-muted-foreground'
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            {harbour.steps[i]}
          </li>
        ))}
      </ol>

      {step === 'where' && (
        <section className="mt-6 flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-title font-bold text-foreground">{harbour.whereTitle}</h1>
            <p className="mt-2 text-ui text-muted-foreground">{harbour.whereBody}</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">{harbour.barLabel}</span>
            <input
              value={bar}
              onChange={(e) => {
                setBar(e.target.value);
                setAtHome(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && canNext && setStep('menu')}
              maxLength={200}
              autoComplete="off"
              className="min-h-11 rounded-sm border border-border bg-card px-3 font-body text-ui text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {recentBars.length > 0 && <span className="label-caps flex w-full">{harbour.recentLabel}</span>}
            {recentBars.map((v) => (
              <Chip key={v} active={!atHome && bar === v} onClick={() => (setBar(v), setAtHome(false))}>
                {v}
              </Chip>
            ))}
            <Chip active={atHome} onClick={() => (setAtHome(true), setBar(''))}>
              {harbour.atHome}
            </Chip>
          </div>
        </section>
      )}

      {step === 'menu' && (
        <section className="mt-6 flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-title font-bold text-foreground">{harbour.menuTitle}</h1>
            <p className="mt-2 text-ui text-muted-foreground">{harbour.menuBody}</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="label-caps">{harbour.addLabel}</span>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                list="harbour-drinks"
                placeholder={harbour.addPlaceholder}
                maxLength={200}
                autoComplete="off"
                className="min-h-11 rounded-sm border border-border bg-card px-3 font-body text-ui text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <button type="submit" className="btn btn-outline self-end px-4">
              {harbour.add}
            </button>
            <datalist id="harbour-drinks">
              {drinkDatabase.map((d) => (
                <option key={d.name} value={titleOf(register, d.name)} />
              ))}
            </datalist>
          </form>

          {items.length > 0 && (
            <ul className="border-t border-foreground">
              {items.map((item) => (
                <li key={item.label} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5">
                  <span className="font-serif text-prose font-bold text-foreground">{item.label}</span>
                  <span
                    className={cn(
                      'mr-auto font-condensed text-2xs uppercase tracking-label',
                      item.drink ? 'text-secondary' : 'text-muted-foreground'
                    )}
                  >
                    {item.drink ? harbour.placed : harbour.unplaced}
                  </span>
                  <button
                    type="button"
                    aria-label={harbour.remove(item.label)}
                    onClick={() => setItems((prev) => prev.filter((i) => i !== item))}
                    className="flex min-h-11 min-w-11 items-center justify-center font-condensed text-title leading-none text-muted-foreground hover:text-primary"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-meta text-muted-foreground">{harbour.photoLater}</p>
        </section>
      )}

      {step === 'pick' && (
        <section className="mt-6 flex flex-col">
          <h1 className="font-serif text-title font-bold text-foreground">
            {where ? harbour.pickTitle(where) : harbour.pickTitleHome}
          </h1>
          <p className="mt-2 text-ui text-muted-foreground">{harbour.pickBody}</p>
          <ol className="mt-4 border-t border-foreground">
            {ranked.map(({ drink, score }, i) => (
              <li key={drink.name} className="border-b border-border">
                <DrinkRow
                  rank={i + 1}
                  title={titleOf(register, drink.name)}
                  figure={score}
                  figureLabel={chart.closenessOf(score)}
                  selected={(choice ?? ranked[0]?.drink.name) === drink.name}
                  onSelect={() => setChoice(drink.name)}
                />
              </li>
            ))}
          </ol>
          {unplaced.length > 0 && (
            <div className="mt-5">
              <span className="label-caps">{harbour.unplacedTitle}</span>
              <p className="mt-1 text-meta text-muted-foreground">{unplaced.map((i) => i.label).join(' · ')}</p>
            </div>
          )}
        </section>
      )}

      {/* The step's actions sit at its foot, the main one full width. */}
      <div className="mt-8 flex items-center gap-3">
        {index > 0 && (
          <button type="button" onClick={() => setStep(STEPS[index - 1])} className="btn btn-outline px-5">
            {harbour.back}
          </button>
        )}
        {step === 'pick' ? (
          <button type="button" onClick={placePick} className="btn btn-primary btn-lg flex-1 px-6">
            {harbour.pickThis}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(STEPS[index + 1])}
            className="btn btn-primary btn-lg flex-1 px-6"
          >
            {harbour.next}
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 border px-3 font-condensed text-xs uppercase tracking-label transition-colors',
        active ? 'border-foreground bg-secondary text-secondary-foreground' : 'border-border bg-card text-foreground hover:border-foreground'
      )}
    >
      {children}
    </button>
  );
}

export default function Harbour({
  register,
  signInEnabled,
  member,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): whose pours to rank against. */
  member: { handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <HarbourContent register={register} member={!!member} />
    </AtprotoProvider>
  );
}
