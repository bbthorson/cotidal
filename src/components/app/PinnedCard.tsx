import type { ReactNode } from 'react';
import { chart } from '@/lib/copy';
import { cn } from '@/lib/utils';

/**
 * A place, opened: pinned above the app bar the way a maps app opens one, so
 * nothing on the page moves and a row tapped at the foot of a list is answered
 * where the thumb is. The drink card and the bar card are both this.
 *
 * `data-drink-card` hides "Pick a drink" while any card is open (globals.css):
 * the card has its own action, and the two would stack in one corner.
 */
export function PinnedCard({
  eyebrow,
  onClose,
  className,
  children,
}: {
  /** Small caps above the title: what kind of place, and where. */
  eyebrow: ReactNode;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-drink-card
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 bottom-tabbar z-20 border-t border-foreground bg-card pb-4 shadow-bar motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:mx-auto sm:max-w-xl sm:border-x lg:bottom-0 lg:pb-safe-b',
        className
      )}
    >
      <div className="flex flex-col gap-2 px-6 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-condensed text-label font-semibold uppercase tracking-label text-secondary">{eyebrow}</span>
          <button
            type="button"
            onClick={onClose}
            className="link-caps -my-2 -mr-2 flex px-2 text-muted-foreground hover:text-foreground"
          >
            {chart.close}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
