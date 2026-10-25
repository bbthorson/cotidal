import { useState, type SubmitEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { connect, nav } from '@/lib/copy';
import { useAtprotoContext } from './AtprotoProvider';

interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The one sign-in pattern (Flow Recommendations, R5). Opened from the menu's
 * "Keep this coordinate" prompt, from the header, and when a guest taps
 * "Log a pour". The landing page renders the same promise statically
 * (src/components/marketing/ConnectForm.astro) from the same copy.
 *
 * A guest's coordinate is published once they are signed in (Home.tsx); the
 * sheet says what signing in buys, not what happens to the data after.
 */
export function SignInSheet({ open, onOpenChange }: SignInSheetProps) {
  const { isEnabled, connecting, error, connect: signIn } = useAtprotoContext();
  const [handle, setHandle] = useState('');

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!handle.trim()) return;
    await signIn(handle.trim());
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/55 data-open:animate-in data-open:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-dvh flex-col gap-4 overflow-y-auto border-t border-foreground bg-background px-6 pb-8 pt-3 text-foreground focus:outline-none data-open:animate-in data-open:fade-in-0 max-sm:data-open:slide-in-from-bottom sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:pt-6 sm:shadow-mcm">
          <div aria-hidden="true" className="h-0.75 w-10 self-center bg-border sm:hidden" />

          <div className="flex flex-col gap-2">
            <span className="font-condensed text-xs font-semibold uppercase tracking-label text-secondary">
              {nav.signIn}
            </span>
            <Dialog.Title className="font-serif text-title font-bold">{connect.title}</Dialog.Title>
            <Dialog.Description className="sr-only">{connect.body}</Dialog.Description>
          </div>

          <ol className="border-t border-foreground">
            {connect.buys.map((b, i) => (
              <li key={b.title} className="flex gap-3 border-b border-border py-3">
                <span className="w-3.5 shrink-0 font-condensed text-sm font-bold text-primary">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-ui font-bold">{b.title}</span>
                  <span className="text-meta text-muted-foreground">{b.body}</span>
                </div>
              </li>
            ))}
          </ol>

          {isEnabled ? (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span
                  className={
                    error
                      ? 'font-condensed text-xs uppercase tracking-label text-destructive'
                      : 'font-condensed text-xs uppercase tracking-label text-muted-foreground'
                  }
                >
                  {connect.label}
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={connect.placeholder}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={connecting}
                  aria-invalid={!!error}
                  className={
                    'min-h-12 rounded-sm border bg-card px-3.5 font-body text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none ' +
                    (error ? 'border-destructive' : 'border-border')
                  }
                />
                {error && (
                  <span role="alert" className="text-meta text-destructive">
                    {error}
                  </span>
                )}
              </label>
              <button
                type="submit"
                disabled={connecting || !handle.trim()}
                className="min-h-13 border border-foreground bg-secondary font-condensed text-sm font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {connecting ? connect.connecting : connect.submit}
              </button>
            </form>
          ) : (
            <p className="border border-border bg-muted px-3 py-2.5 text-meta text-muted-foreground">
              {connect.disabled}
            </p>
          )}

          <Dialog.Close className="flex min-h-11 items-center self-center px-2 font-condensed text-meta uppercase tracking-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {connect.guest}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
