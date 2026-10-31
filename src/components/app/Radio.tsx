import { useMemo, useState } from 'react';
import { pour, radio } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { usePours } from '@/hooks/usePours';
import { AtprotoProvider, useAtprotoContext } from './AtprotoProvider';
import { WaitingPick } from './WaitingPick';
import { GuestPrompt, Loading, ScreenHeader } from './ui';

type Filter = (typeof radio.filters)[number]['id'];

/** "Today", "Yesterday", or the date: the day a run of entries went out. */
function dayLabel(iso: string, now = new Date()): string {
  const day = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(day)) / 86_400_000);
  if (diff === 0) return radio.today;
  if (diff === 1) return radio.yesterday;
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Radio: pours as they go out, newest first, kept like a radio log — the
 * time in the margin, who sent it, what and where. Today it carries your
 * own pours; Following and Nearby are on the dial and say plainly they are
 * Later, rather than standing empty.
 *
 * From `lg` the log takes two thirds and the dial sits beside it, with a pick
 * waiting and what signing in buys; on a phone the dial comes first.
 *
 * `member` is the server's answer (`accountFor`), so a guest is told what
 * signing in buys before anything loads.
 */
function RadioContent({
  register,
  member,
  canSignIn,
}: {
  register: Register;
  member: { handle: string | null } | null;
  canSignIn: boolean;
}) {
  const { pours } = usePours(!!member);
  const [filter, setFilter] = useState<Filter>('all');
  const { openSignIn } = useAtprotoContext();
  const name = (n: string) => titleOf(register, n);
  const sender = member?.handle ? `@${member.handle}` : member ? radio.you : radio.onDevice;

  const days = useMemo(() => {
    const groups: { label: string; pours: PourRecord[] }[] = [];
    for (const p of pours ?? []) {
      const label = dayLabel(p.createdAt);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.pours.push(p);
      else groups.push({ label, pours: [p] });
    }
    return groups;
  }, [pours]);

  return (
    <div className="mx-auto max-w-xl pb-6 pt-6 lg:max-w-none lg:pt-10">
      <ScreenHeader eyebrow={radio.title} title={radio.heading} />

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-8 lg:col-start-3 lg:row-start-1">
          <div role="group" aria-label={radio.filterLabel} className="segmented grid grid-cols-3">
            {radio.filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className="segment"
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <WaitingPick displayName={name} />
          </div>

          {!member && canSignIn && (
            <GuestPrompt className="mb-4" title={radio.guestTitle} body={radio.guestBody} onSignIn={openSignIn} />
          )}
        </div>

        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          {filter !== 'all' ? (
            <p className="border-y border-border py-6 font-serif text-prose italic text-muted-foreground">
              {filter === 'following' ? radio.followingLater : radio.nearbyLater}
            </p>
          ) : pours === null ? (
            <Loading />
          ) : pours.length === 0 ? (
            // "Pick a drink" floats over the page already; a second button here only repeats it.
            <p className="border-y border-border py-6 font-serif text-prose italic text-muted-foreground">{radio.empty}</p>
          ) : (
            days.map((day) => (
              <section key={day.label} aria-label={day.label} className="mt-2">
                <h2 className="label-caps border-b border-foreground pb-1 pt-3 text-secondary">{day.label}</h2>
                <ol>
                  {day.pours.map((p, i) => {
                    const entry = register[p.drink.name];
                    const where = p.isHomePour ? pour.home : p.venue?.entity?.name;
                    return (
                      <li key={`${p.createdAt}-${i}`} className="grid grid-cols-radio gap-x-3 border-b border-border py-3">
                        <time
                          dateTime={p.createdAt}
                          className="pt-1 font-condensed text-meta tabular-nums text-muted-foreground"
                        >
                          {new Date(p.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </time>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-meta font-bold text-secondary">
                            {sender}
                            {where && <span className="font-normal text-muted-foreground"> · {where}</span>}
                          </span>
                          <div className="dot-leader">
                            {entry ? (
                              <a
                                href={`/drinks/${entry.slug}`}
                                className="font-serif text-prose font-bold text-foreground transition-colors hover:underline hover:underline-offset-4"
                              >
                                {entry.title}
                              </a>
                            ) : (
                              <span className="font-serif text-prose font-bold text-foreground">{p.drink.name}</span>
                            )}
                            <span aria-hidden="true" className="leader" />
                            <span className="shrink-0 font-condensed text-ui font-semibold tabular-nums">
                              {pour.scoreOf(p.rating.hedonic)}
                            </span>
                          </div>
                          {p.note && <p className="font-serif text-ui italic text-foreground">“{p.note}”</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function Radio({
  register,
  signInEnabled,
  member,
}: {
  register: Register;
  signInEnabled: boolean;
  member: { handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <RadioContent register={register} member={member} canSignIn={signInEnabled} />
    </AtprotoProvider>
  );
}
