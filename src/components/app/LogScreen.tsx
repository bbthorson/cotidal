import { useState } from 'react';
import { logPage, menu } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { publicMapPath, startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { destinations } from '@/lib/site-nav';
import { useLog } from '@/hooks/useLog';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { TrackFigure } from './TrackFigure';
import { ColdState } from './ColdState';
import { PourLedger } from './PourLedger';
import { WaitingPick } from './WaitingPick';
import { RateSheet } from './RateSheet';
import { GuestPrompt, ScreenHeader } from './ui';
import { AccountSection } from './AccountSection';

/**
 * Log: yours. Where you are, the track that brought you there, what your
 * pours add up to, the log of what moved you, and the account. Rating a pour is a sheet over
 * this screen (`RateSheet`); this is where its result is kept, and a link from
 * outside the app (a chat assistant's draft) lands here to open it.
 *
 * From `lg` the track and its figures hold the left column while the log
 * and the account scroll beside them; on a phone they stack, track first.
 *
 * This file draws; what it draws and what a tap does is `useLog`.
 */
function LogContent({
  register,
  member,
}: {
  register: Register;
  member: { handle: string | null } | null;
}) {
  const { isEnabled, openSignIn } = useAtprotoContext();
  const log = useLog(register, member);
  const { rate, isMember, profile, setProfile, pours, reload, history, name } = log;
  const [friendHandle, setFriendHandle] = useState('');

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
    <div className="mx-auto max-w-xl pb-6 pt-6 lg:max-w-none lg:pt-10">
      <ScreenHeader eyebrow={logPage.title} title={logPage.heading} />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          {/* Where you are, and the way you came. */}
          <div className="flex flex-col gap-1">
            <span className="label-caps">
              {!isMember && `${logPage.guestEyebrow} · `}
              {menu.youAreIn}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-serif text-subtitle italic leading-none text-primary">{log.region.name}</span>
              <span className="font-condensed text-label font-semibold tabular-nums tracking-label text-secondary">
                {formatCoordinate(log.you.x, log.you.y)}
              </span>
            </span>
          </div>
          {log.track && log.track.length > 1 && <TrackFigure track={log.track} />}
          <dl className="grid grid-cols-2 border-t border-foreground">
            {log.stats.map((st, i) => (
              <div key={st.label} className={`flex flex-col gap-0.5 border-b border-border py-2.5 ${i % 2 ? 'pl-4' : 'border-r pr-4'}`}>
                <dt className="label-caps">{st.label}</dt>
                <dd className="truncate font-condensed text-ui font-semibold tabular-nums text-foreground">{st.value}</dd>
              </div>
            ))}
          </dl>
          {log.tolerances && (
            <div>
              <p className="label-caps mb-1.5">{logPage.tolerancesTitle}</p>
              <dl className="grid grid-cols-3 border-t border-border">
                {log.tolerances.map((item, i) => (
                  <div key={item.label} className={`flex flex-col gap-0.5 border-b border-border py-2 ${i > 0 ? 'border-l pl-3' : 'pr-3'}`}>
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
            <PourLedger
              pours={history}
              register={register}
              empty={logPage.ledgerEmpty}
              loading={pours === null}
              track={log.track}
              startLabel={log.startLabel}
            />
          </section>

          {/* Quick ATProto comparison: type a friend's Bluesky handle to open `/p/<handle>`. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleaned = friendHandle.trim().replace(/^@/, '');
              if (cleaned) window.location.assign(publicMapPath(cleaned));
            }}
            className="mt-8 border-t border-border pt-6"
          >
            <h2 className="section-title">{logPage.compareTitle}</h2>
            <div className="mt-3 flex gap-2">
              <label className="flex flex-1 flex-col">
                <span className="sr-only">{logPage.compareLabel}</span>
                <input
                  value={friendHandle}
                  onChange={(e) => setFriendHandle(e.target.value)}
                  placeholder={logPage.comparePlaceholder}
                  autoComplete="off"
                  autoCapitalize="none"
                  className="field min-h-11"
                />
              </label>
              <button type="submit" className="btn btn-outline px-4">
                {logPage.compareSubmit}
              </button>
            </div>
          </form>

          {/* A guest, once a pour is here to keep: what signing in buys, under the log it would keep. */}
          {!isMember && isEnabled && history.length > 0 && (
            <GuestPrompt className="mt-6" title={logPage.guestTitle} body={logPage.guestBody} onSignIn={openSignIn} />
          )}

          <AccountSection
            handle={member?.handle ?? null}
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
      {sheet}
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
