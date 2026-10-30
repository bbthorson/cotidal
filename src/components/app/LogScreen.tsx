import { useMemo, useState } from 'react';
import { drinkDatabase } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { calculateDistance } from '@/lib/scoring';
import { logPage, nav } from '@/lib/copy';
import { RATE_PATH, startOverPath } from '@/lib/atproto/paths';
import { titleOf, type Register } from '@/lib/register';
import { barsFromPours } from '@/lib/pour-history';
import { userFromProfile } from '@/lib/profile';
import { neutralProfile } from '@/lib/guest-palate';
import { destinations, logPathFor, questionsHref } from '@/lib/site-nav';
import { useMenu } from '@/hooks/useMenu';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { Chart, DrinkCard, useLastPours, type Lens } from './Chart';
import { ColdState } from './ColdState';
import { PourLedger } from './PourLedger';
import { WaitingPick } from './WaitingPick';
import { AccountSection } from './AccountSection';

/**
 * Log: yours. Where you are on the map, what your pours add up to, the
 * ledger of what moved you, and the account. Rating a pour is its own screen
 * (`/rate`); this is where its result is kept.
 */
function LogContent({
  register,
  member,
}: {
  register: Register;
  member: { handle: string | null } | null;
}) {
  const { isEnabled, openSignIn } = useAtprotoContext();
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours } = usePours(isMember);
  const history = useMemo(() => pours ?? [], [pours]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;
  const region = quadrantFor(x, y);

  // The map: your menu filled in, or your pours, and any drink opened in the card.
  const [lens, setLens] = useState<Lens>('drinks');
  const [selected, setSelected] = useState<string | null>(null);
  const user = useMemo(() => userFromProfile(profile), [profile]);
  const { menu, closeness } = useMenu(user, profile?.vibeTags, history);
  const lastPourOf = useLastPours(history);
  const selectedDrink = selected ? drinkDatabase.find((d) => d.name === selected) ?? null : null;
  const name = (n: string) => titleOf(register, n);

  // The drink closest to you, for the account's "share" line.
  const nearest = useMemo(
    () => [...drinkDatabase].sort((a, b) => calculateDistance({ x, y }, a) - calculateDistance({ x, y }, b))[0]?.name ?? '',
    [x, y]
  );

  // A stranger with no coordinate: say what this page is, and the ways in.
  if (!profile && !isMember) {
    return (
      <ColdState
        eyebrow={logPage.title}
        onSignIn={openSignIn}
        onGuest={() => {
          setProfile(neutralProfile);
          window.location.assign(RATE_PATH);
        }}
      />
    );
  }

  const bars = barsFromPours(history).length;
  const first = history.length > 0 ? history[history.length - 1] : null;
  const best = history.reduce<(typeof history)[number] | null>(
    (top, p) => (!top || p.rating.hedonic > top.rating.hedonic ? p : top),
    null
  );
  const stats = [
    { label: logPage.stats.pours, value: String(history.length) },
    { label: logPage.stats.bars, value: String(bars) },
    ...(first
      ? [
          {
            label: logPage.stats.since,
            value: new Date(first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
    ...(best ? [{ label: logPage.stats.best, value: name(best.drink.name) }] : []),
  ];

  return (
    <div className={cn('mx-auto max-w-xl pb-6 pt-4 lg:pt-8', selectedDrink && 'pb-80')}>
      {/* Named for screen readers; on screen the app bar already says where you are. */}
      <h1 className="sr-only">{logPage.title}</h1>

      {/* Where you are: the map is yours, so it lives here */}
      <Chart
        you={{ x, y }}
        menuNames={menu.map((d) => d.name)}
        lastPour={lastPourOf}
        lens={lens}
        onLens={(l) => {
          setLens(l);
          setSelected(null);
        }}
        selected={selected}
        onSelect={(n) => setSelected((cur) => (cur === n ? null : n))}
        register={register}
        onTakeQuiz={() => window.location.assign(questionsHref)}
        eyebrow={isMember ? undefined : logPage.guestEyebrow}
      />
      <dl className="mt-4 grid grid-cols-2 border-t border-foreground">
        {stats.map((st, i) => (
          <div key={st.label} className={`flex flex-col gap-0.5 border-b border-border py-2.5 ${i % 2 ? 'pl-4' : 'border-r pr-4'}`}>
            <dt className="label-caps">{st.label}</dt>
            <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <WaitingPick displayName={name} />
      </div>

      <section className="mt-8">
        <div className="mb-1 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-bold">{logPage.ledgerTitle}</h2>
          <a
            href={RATE_PATH}
            className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-secondary hover:text-primary"
          >
            {logPage.rateDrink}
          </a>
        </div>
        <PourLedger pours={history} register={register} empty={logPage.ledgerEmpty} loading={pours === null} />
      </section>

      {/* A guest: what signing in buys, once, under the log it would keep. */}
      {!isMember && isEnabled && (
        <div className="mt-6 flex items-center gap-3 border border-border bg-card p-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-serif text-base font-bold">{logPage.guestTitle}</span>
            <span className="text-meta text-muted-foreground">{logPage.guestBody}</span>
          </div>
          <button type="button" onClick={openSignIn} className="btn btn-primary shrink-0 px-3.5">
            {nav.signIn}
          </button>
        </div>
      )}

      <AccountSection
        handle={member?.handle ?? null}
        topName={name(nearest)}
        regionName={region.name}
        onStartOver={() => window.location.assign(startOverPath)}
      />

      {/* The reading pages: on a phone the app pages have no Menu, so they are here. */}
      <nav aria-label={logPage.readingLabel} className="mt-6 flex flex-wrap gap-x-5 border-t border-border pt-2">
        {destinations
          .filter((d) => !d.app)
          .map((d) => (
            <a
              key={d.href}
              href={d.href}
              className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground transition-colors hover:text-primary"
            >
              {d.label}
            </a>
          ))}
      </nav>
      {selectedDrink && (
        <DrinkCard
          drink={selectedDrink}
          register={register}
          closeness={closeness[selectedDrink.name]}
          last={lastPourOf.get(selectedDrink.name)}
          sameSpot={drinkDatabase.filter(
            (d) => d.name !== selectedDrink.name && d.x === selectedDrink.x && d.y === selectedDrink.y
          )}
          onPick={setSelected}
          onLog={() => window.location.assign(logPathFor(selectedDrink.name))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default function LogScreen({
  register,
  signInEnabled,
  member,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <LogContent register={register} member={member} />
    </AtprotoProvider>
  );
}
