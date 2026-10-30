import { useMemo, useState } from 'react';
import { nav, pour, radio } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';
import { usePours } from '@/hooks/usePours';
import { cn } from '@/lib/utils';
import { AtprotoProvider } from './AtprotoProvider';
import { WaitingPick } from './WaitingPick';
import { SignInSheet } from './SignInSheet';

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
  const [signInOpen, setSignInOpen] = useState(false);
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
    <div className="mx-auto max-w-xl pb-6 pt-4 lg:pt-8">
      {/* Named for screen readers; on screen the app bar already says where you are. */}
      <h1 className="sr-only">{radio.title}</h1>

      <div role="group" aria-label={radio.filterLabel} className="grid grid-cols-3 border border-foreground">
        {radio.filters.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'min-h-11 font-condensed text-xs font-semibold uppercase tracking-wider transition-colors focus-ring-inset',
              i > 0 && 'border-l border-foreground',
              filter === f.id ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <WaitingPick displayName={name} />
      </div>

      {!member && canSignIn && (
        <div className="mb-4 flex items-center gap-3 border border-border bg-card p-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-serif text-base font-bold">{radio.guestTitle}</span>
            <span className="text-meta text-muted-foreground">{radio.guestBody}</span>
          </div>
          <button type="button" onClick={() => setSignInOpen(true)} className="btn btn-primary shrink-0 px-3.5">
            {nav.signIn}
          </button>
        </div>
      )}

      {filter !== 'all' ? (
        <p className="border-y border-border py-6 font-serif text-prose italic text-muted-foreground">
          {filter === 'following' ? radio.followingLater : radio.nearbyLater}
        </p>
      ) : pours === null ? (
        <p className="py-6 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">…</p>
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
                      <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
                        {sender}
                        {where && <span className="font-normal text-muted-foreground"> · {where}</span>}
                      </span>
                      <div className="dot-leader">
                        {entry ? (
                          <a
                            href={`/drinks/${entry.slug}`}
                            className="font-serif text-prose font-bold text-foreground transition-colors hover:text-primary"
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

      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
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
