import { useId, type KeyboardEvent, type SubmitEvent } from 'react';
import { logPage, menu } from '@/lib/copy';
import { formatCoordinate } from '@/lib/coordinate';
import { startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';
import { neutralProfile } from '@/lib/guest-palate';
import { destinations } from '@/lib/site-nav';
import { useLog } from '@/hooks/useLog';
import { cn } from '@/lib/utils';
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
 * pours add up to, the ledger of what moved you, and comparing palates.
 * Full account management lives on `/settings`; Log keeps only a quiet foot
 * strip (public map, share, Settings -> for members; Start over for guests).
 *
 * From `lg` the coordinate, track and figures hold the sticky left column
 * while the ledger and compare scroll beside them; on a phone they stack.
 *
 * This file draws; what it draws and what a tap does is `useLog`.
 */
function LogContent({
  register,
  member,
}: {
  register: Register;
  member: { did: string; handle: string | null } | null;
}) {
  const { isEnabled, openSignIn } = useAtprotoContext();
  const log = useLog(register, member);
  const { rate, isMember, profile, setProfile, pours, reload, history, follows, compare, name } = log;
  const compareListboxId = useId();
  const compareOpen = compare.suggestions.length > 0;

  const onCompareSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    compare.submit();
  };

  const onCompareKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!compareOpen) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      compare.moveActive(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      compare.closeSuggestions();
    }
  };

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

  const statCols = log.stats.length === 3 ? 3 : 2;

  return (
    <div className="mx-auto max-w-xl pb-6 pt-6 lg:max-w-none lg:pt-10">
      <ScreenHeader
        eyebrow={logPage.title}
        title={logPage.heading}
        action={
          <button type="button" onClick={() => rate.open()} className="btn btn-primary px-4">
            {logPage.rateDrink}
          </button>
        }
      />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
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

          {/* Balanced figures block: 2 or 3 columns so there is never an orphan cell. */}
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

          {log.tolerances && (
            <div className="flex flex-col gap-2">
              <p className="label-caps">{logPage.tolerancesTitle}</p>
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
            <h2 className="section-title">{logPage.ledgerTitle}</h2>
            <PourLedger
              pours={history}
              register={register}
              empty={logPage.ledgerEmpty}
              loading={pours === null}
              track={log.track}
              startLabel={log.startLabel}
            />
          </section>

          {/* Consolidated social / comparison band: followed friends + Bluesky handle lookup with typeahead. */}
          <section className="mt-10">
            <h2 className="section-title">{logPage.compareTitle}</h2>
            {follows.length > 0 && (
              <ul className="mt-1">
                {follows.map((f) => (
                  <li key={f.did} className="border-b border-border py-3">
                    <a href={f.path} className="group block">
                      <div className="dot-leader">
                        <span className="font-serif text-prose font-bold text-foreground group-hover:underline group-hover:underline-offset-4">
                          @{f.handle}
                        </span>
                        <span aria-hidden="true" className="leader" />
                        <span className="shrink-0 font-condensed text-meta text-secondary">{f.region}</span>
                      </div>
                      <p className="mt-0.5 text-meta text-muted-foreground">
                        {f.description}
                        {f.theirs ? ` · ${logPage.followsContrast(name(f.theirs))}` : ''}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={onCompareSubmit} className="mt-4 flex flex-col gap-2">
              <p className="text-meta text-muted-foreground">{logPage.compareHint}</p>
              <div className="relative flex gap-2">
                <label className="flex flex-1 flex-col">
                  <span className="sr-only">{logPage.compareLabel}</span>
                  <input
                    value={compare.query}
                    onChange={(e) => compare.setQuery(e.target.value)}
                    onKeyDown={onCompareKeyDown}
                    onBlur={compare.closeSuggestions}
                    placeholder={logPage.comparePlaceholder}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="url"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={compareOpen}
                    aria-controls={compareListboxId}
                    aria-activedescendant={
                      compareOpen && compare.activeIndex >= 0
                        ? `${compareListboxId}-opt-${compare.activeIndex}`
                        : undefined
                    }
                    className="field min-h-11"
                  />
                </label>
                <button type="submit" className="btn btn-outline shrink-0 px-4">
                  {logPage.compareSubmit}
                </button>

                {compareOpen && (
                  <ul
                    id={compareListboxId}
                    role="listbox"
                    aria-label={logPage.compareSuggestionsLabel}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto border border-foreground bg-card shadow-bar"
                  >
                    {compare.suggestions.map((suggestion, index) => (
                      <li
                        key={suggestion.did}
                        id={`${compareListboxId}-opt-${index}`}
                        role="option"
                        aria-selected={index === compare.activeIndex}
                        onMouseEnter={() => compare.setActive(index)}
                        onClick={() => compare.choose(suggestion)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0',
                          index === compare.activeIndex ? 'bg-muted' : 'hover:bg-muted'
                        )}
                      >
                        {suggestion.avatar ? (
                          <img
                            src={suggestion.avatar}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-condensed text-meta font-bold uppercase text-foreground"
                          >
                            {(suggestion.displayName || suggestion.handle).charAt(0)}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          {suggestion.displayName && (
                            <span className="truncate font-serif text-ui font-bold text-foreground">
                              {suggestion.displayName}
                            </span>
                          )}
                          <span className="truncate text-meta text-muted-foreground">@{suggestion.handle}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          </section>

          {/* A guest, once a pour is here to keep: what signing in buys, under the log it would keep. */}
          {!isMember && isEnabled && history.length > 0 && (
            <GuestPrompt className="mt-8" title={logPage.guestTitle} body={logPage.guestBody} onSignIn={openSignIn} />
          )}

          <AccountSection
            handle={member?.handle ?? null}
            topName={log.nearestName}
            regionName={log.region.name}
            onStartOver={() => window.location.assign(startOverPath)}
            flush={!isMember && isEnabled && history.length > 0}
          />

          {/* The reading pages on a phone: app pages hide SiteFooter below lg, so they live here only on phones. */}
          <nav aria-label={logPage.readingLabel} className="mt-6 flex flex-wrap gap-x-5 border-t border-border pt-2 lg:hidden">
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
  member: { did: string; handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <LogContent register={register} member={member} />
    </AtprotoProvider>
  );
}
