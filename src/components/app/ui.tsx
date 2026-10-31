import type { ReactNode } from 'react';
import { nav } from '@/lib/copy';
import { cn } from '@/lib/utils';

/** A toggle in a wrapped row of choices: what was off, a recent bar. Pressed is forest. */
export function Chip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('chip', className)}>
      {children}
    </button>
  );
}

/**
 * How an app screen opens: an eyebrow, the title, and a lede if the screen
 * needs one — left-aligned, at one size, on every app screen. The reading
 * pages open with `PageTitle` instead; the two tiers differ on purpose.
 */
export function ScreenHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="pb-5">
      <p className="label-caps">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-title font-bold text-foreground">{title}</h1>
      {lede && <p className="mt-2 text-ui text-muted-foreground">{lede}</p>}
    </div>
  );
}

/**
 * What a guest is told signing in buys, once, in the place it would keep:
 * a title, a line, and the one sign-in button. Ruled above and below rather
 * than boxed: a screen's one sheet is what is yours, and this is not.
 */
export function GuestPrompt({
  title,
  body,
  onSignIn,
  className,
}: {
  title: string;
  body: string;
  onSignIn: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-y border-foreground py-4', className)}>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-serif text-prose font-bold">{title}</span>
        <span className="text-meta text-muted-foreground">{body}</span>
      </div>
      <button type="button" onClick={onSignIn} className="btn btn-primary shrink-0 px-3.5">
        {nav.signIn}
      </button>
    </div>
  );
}

/**
 * A list with nothing in it yet: one sentence in the voice, italic, ruled
 * beneath, and at most one action. It sits under the list's own heading, so
 * it brings no heading of its own. A whole screen that cannot start without a
 * coordinate is a different thing: `ColdState`, a `ScreenHeader` and its ways in.
 */
export function Empty({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-4 border-b border-border py-6', className)}>
      <p className="font-serif text-prose italic text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

/** Held in a list's place while it loads. */
export function Loading() {
  return <p className="py-6 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">…</p>;
}
