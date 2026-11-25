import { mapPage } from '@/lib/copy';
import { publicMapPath, startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { useMap } from '@/hooks/useMap';
import { cn } from '@/lib/utils';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { TrackFigure } from './TrackFigure';
import { YourChart } from './YourChart';
import { DrinkCard } from './Chart';
import { ColdState } from './ColdState';
import { PourLedger } from './PourLedger';
import { WaitingPick } from './WaitingPick';
import { RateSheet } from './RateSheet';
import { GuestPrompt, ScreenHeader } from './ui';
import { StartOver } from './StartOver';

/**
 * Your map: you. The chart of you (`YourChart`: where you are, how sure,
 * the way you came, what you have poured), the track up close, what your
 * pours add up to, and the ledger of what moved you. Comparing with someone
 * is at your link (`/p/<handle>`, a member's), which this links to. Its one action is
 * Rate a drink; choosing one is Compass's. The account is Settings (your handle, in the header's Menu); a
 * guest, who has no Settings, finds Start over at the foot.
 *
 * From `lg` the coordinate, track and figures hold the sticky left column
 * while the ledger scrolls beside them; on a phone they stack.
 *
 * This file draws; what it draws and what a tap does is `useMap`.
 */
function MapContent({
  register,
  member,
}: {
  register: Register;
  member: { did: string; handle: string | null } | null;
}) {
  const { isEnabled, openSignIn } = useAtprotoContext();
  const log = useMap(register, member);
  const { rate, isMember, profile, setProfile, pours, reload, history, name } = log;
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

  const statCols = log.stats.length === 3 ? 3 : 2;

  return (
    <div className={cn('mx-auto max-w-xl pb-6 pt-6 lg:max-w-none lg:pt-10', log.selectedDrink && 'pb-card-clearance')}>
      <ScreenHeader
        title={mapPage.heading}
        action={
          <button type="button" onClick={() => rate.open()} className="btn btn-primary px-4">
            {mapPage.rateDrink}
          </button>
        }
      />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          {/* You: where you are, how sure, the way you came, and what you have poured. */}
          <YourChart
            you={log.you}
            track={log.track}
            poured={log.poured}
            lastPour={log.lastPour}
            selected={log.selected}
            onSelect={log.chooseDrink}
            name={name}
            eyebrow={isMember ? undefined : mapPage.guestEyebrow}
          />

          {/* The way you came, up close: the chart is too large a scale for a half-point move. */}
          {log.track && log.track.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="label-caps">{mapPage.upClose}</p>
              <TrackFigure track={log.track} />
            </div>
          )}

          {/* Balanced figures block: 2 or 3 columns so there is never an orphan cell. */}
          {log.stats.length > 0 && (
            <dl className={cn('grid border-t border-foreground', statCols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {log.stats.map((st, i) => (
                <div
                  key={st.label}
                  className={cn(
                    'flex flex-col gap-0.5 border-b border-border py-2.5',
                    i % statCols !== 0 && 'border-l pl-3.5',
                    i % statCols !== statCols - 1 && 'pr-3.5'
                  )}
                >
                  <dt className="label-caps">{st.label}</dt>
                  <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {log.tolerances && (
            <div className="flex flex-col gap-2">
              <p className="label-caps">{mapPage.tolerancesTitle}</p>
              <dl className="grid grid-cols-3 border-t border-border">
                {log.tolerances.map((item, i) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex flex-col gap-0.5 border-b border-border py-2',
                      i > 0 && 'border-l pl-3.5',
                      i < 2 && 'pr-3.5'
                    )}
                  >
                    <dt className="label-caps">{item.label}</dt>
                    <dd className="font-condensed text-ui font-semibold tabular-nums text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className="mt-8 lg:mt-0">
          <WaitingPick displayName={name} version={rate.version} onRate={(draft) => rate.open({ drink: draft.drink, draft })} />

          <section>
            <h2 className="section-title">{mapPage.ledgerTitle}</h2>
            <PourLedger
              pours={history}
              register={register}
              empty={mapPage.ledgerEmpty}
              loading={pours === null}
              track={log.track}
              startLabel={log.startLabel}
            />
          </section>

          {/* Comparing is at your link, where theirs and yours are drawn together. */}
          {member && (
            <a
              href={`${publicMapPath(member.handle ?? member.did)}#compare`}
              className="link-caps mt-6 text-secondary hover:underline hover:underline-offset-4"
            >
              {mapPage.compareLink} &rarr;
            </a>
          )}

          {/* A guest, once a pour is here to keep: what signing in buys, under the log it would keep. */}
          {!isMember && isEnabled && history.length > 0 && (
            <GuestPrompt className="mt-8" title={mapPage.guestTitle} body={mapPage.guestBody} onSignIn={openSignIn} />
          )}

          {!isMember && (
            <StartOver
              onConfirm={() => window.location.assign(startOverPath)}
              flush={isEnabled && history.length > 0}
            />
          )}
        </div>
      </div>
      {log.selectedDrink && (
        <DrinkCard
          drink={log.selectedDrink}
          register={register}
          distance={log.distance[log.selectedDrink.name]}
          last={log.lastPour.get(log.selectedDrink.name)}
          sameSpot={log.sameSpot}
          onPick={log.setSelected}
          onLog={() => rate.open({ drink: log.selectedDrink!.name })}
          onClose={log.closeDrink}
        />
      )}
      {sheet}
    </div>
  );
}

export default function MapScreen({
  register,
  signInEnabled,
  member,
}: {
  register: Register;
  signInEnabled: boolean;
  /** The server's answer (`accountFor`): who is reading, before anything loads. */
  member: { did: string; handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <MapContent register={register} member={member} />
    </AtprotoProvider>
  );
}
