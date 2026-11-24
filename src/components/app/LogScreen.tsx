import { logPage } from '@/lib/copy';
import { startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { destinations, questionsHref } from '@/lib/site-nav';
import { useLog } from '@/hooks/useLog';
import { cn } from '@/lib/utils';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { Chart, DrinkCard } from './Chart';
import { ColdState } from './ColdState';
import { PourLedger } from './PourLedger';
import { WaitingPick } from './WaitingPick';
import { RateSheet } from './RateSheet';
import { GuestPrompt, ScreenHeader } from './ui';
import { AccountSection } from './AccountSection';

/**
 * Log: yours. Where you are on the map, what your pours add up to, the
 * ledger of what moved you, and the account. Rating a pour is a sheet over
 * this screen (`RateSheet`); this is where its result is kept, and a link from
 * outside the app (a chat assistant's draft) lands here to open it.
 *
 * From `lg` the chart and its figures hold the left column while the ledger
 * and the account scroll beside them; on a phone they stack, chart first.
 *
 * This file draws; what it draws and what a tap does is `useLog`.
 */
function LogContent({
  register,
  member,
  mcpAddress,
}: {
  register: Register;
  member: { handle: string | null } | null;
  mcpAddress: string;
}) {
  const { isEnabled, openSignIn } = useAtprotoContext();
  const log = useLog(register, member);
  const { rate, isMember, profile, setProfile, pours, reload, history, selectedDrink, name } = log;

  // Rating opens over this screen, with or without a coordinate yet.
  const sheet = (
    <RateSheet
      request={rate.request}
      onClose={rate.close}
      register={register}
      member={member}
      profile={profile}
      setProfile={setProfile}
      pours={pours}
      reload={reload}
    />
  );

  // A stranger with no coordinate: say what this page is, and the ways in.
  if (log.cold) {
    return (
      <>
        <ColdState
          eyebrow={logPage.title}
          onSignIn={openSignIn}
          onGuest={() => {
            setProfile(neutralProfile);
            rate.open();
          }}
        />
        {sheet}
      </>
    );
  }

  return (
    <div className={cn('mx-auto max-w-xl pb-6 pt-6 lg:max-w-none lg:pt-10', selectedDrink && 'pb-card-clearance')}>
      <ScreenHeader eyebrow={logPage.title} title={logPage.heading} />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-8">
          {/* Where you are: the map is yours, so it lives here */}
          <Chart
            you={log.you}
            menuNames={log.menuNames}
            lastPour={log.lastPour}
            lens={log.lens}
            onLens={log.setLens}
            selected={log.selected}
            onSelect={log.toggleDrink}
            register={register}
            onTakeQuiz={() => window.location.assign(questionsHref)}
            eyebrow={isMember ? undefined : logPage.guestEyebrow}
          />
          <dl className="mt-4 grid grid-cols-2 border-t border-foreground">
            {log.stats.map((st, i) => (
              <div key={st.label} className={`flex flex-col gap-0.5 border-b border-border py-2.5 ${i % 2 ? 'pl-4' : 'border-r pr-4'}`}>
                <dt className="label-caps">{st.label}</dt>
                <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 lg:mt-0">
          <WaitingPick displayName={name} version={rate.version} onRate={(draft) => rate.open({ drink: draft.drink, draft })} />

          <section>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-heading font-bold">{logPage.ledgerTitle}</h2>
              <button
                type="button"
                onClick={() => rate.open()}
                className="link-caps text-secondary hover:underline hover:underline-offset-4"
              >
                {logPage.rateDrink}
              </button>
            </div>
            <PourLedger pours={history} register={register} empty={logPage.ledgerEmpty} loading={pours === null} />
          </section>

          {/* A guest: what signing in buys, once, under the log it would keep. */}
          {!isMember && isEnabled && (
            <GuestPrompt className="mt-6" title={logPage.guestTitle} body={logPage.guestBody} onSignIn={openSignIn} />
          )}

          <AccountSection
            handle={member?.handle ?? null}
            mcpAddress={mcpAddress}
            topName={log.nearestName}
            regionName={log.region.name}
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
                  className="link-caps text-muted-foreground hover:text-foreground"
                >
                  {d.label}
                </a>
              ))}
          </nav>
        </div>
      </div>
      {selectedDrink && (
        <DrinkCard
          drink={selectedDrink}
          register={register}
          closeness={log.closeness[selectedDrink.name]}
          last={log.lastPour.get(selectedDrink.name)}
          sameSpot={log.sameSpot}
          onPick={log.setSelected}
          onLog={() => rate.open({ drink: selectedDrink.name })}
          onClose={log.closeDrink}
        />
      )}
      {sheet}
    </div>
  );
}

export default function LogScreen({
  register,
  signInEnabled,
  member,
  mcpAddress,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { handle: string | null } | null;
  /** The `/mcp` address on this host (the server knows the host). */
  mcpAddress: string;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <LogContent register={register} member={member} mcpAddress={mcpAddress} />
    </AtprotoProvider>
  );
}
