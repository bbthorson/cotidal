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
 * What a guest is told signing in buys, once, in the place it would keep:
 * a title, a line, and the one sign-in button.
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
    <div className={cn('flex items-center gap-3 border border-border bg-card p-4', className)}>
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

/** Held in a list's place while it loads. */
export function Loading() {
  return <p className="py-6 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">…</p>;
}
