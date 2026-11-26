import { useId, type KeyboardEvent, type SubmitEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { connect, nav } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { useSignIn } from '@/hooks/use-sign-in';
import { useAtprotoContext } from './AtprotoContext';
import { Notice } from './ui';

interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-9 w-9 shrink-0 rounded-full bg-muted object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-condensed text-ui font-bold uppercase text-foreground"
    >
      {name.charAt(0)}
    </span>
  );
}

/**
 * The one in-app sign-in sheet, mounted once by `AtprotoProvider` and opened
 * with `openSignIn()`. Backed by `@bbthorson/atproto-cf-auth`'s
 * `createSignInController` (`useSignIn`): remembered accounts on this device,
 * live handle typeahead, handle normalisation, and in-flow account creation
 * (`prompt=create`).
 *
 * The standalone `/sign-in` page (`ConnectForm.astro`) mirrors this flow with
 * `<bsky-sign-in>` progressive enhancement over a plain form post.
 */
export function SignInSheet({ open, onOpenChange }: SignInSheetProps) {
  const { isEnabled, redirectError } = useAtprotoContext();
  const { state, setQuery, moveActive, setActive, closeSuggestions, submit, signUp, choose, forget } = useSignIn(
    isEnabled,
    redirectError
  );
  const listboxId = useId();
  const errorId = useId();

  const loading = state.status === 'loading';
  const suggestionsOpen = state.suggestions.length > 0;
  const errorMessage = state.error?.message ?? null;

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(e.key === 'ArrowDown' ? 1 : -1);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim data-open:animate-in data-open:fade-in-0" />
        <Dialog.Content
          onEscapeKeyDown={(e) => {
            if (suggestionsOpen) {
              e.preventDefault();
              closeSuggestions();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-dvh flex-col gap-5 overflow-y-auto border-t border-foreground bg-background px-6 pb-8 pt-3 text-foreground focus:outline-none data-open:animate-in data-open:fade-in-0 max-sm:data-open:slide-in-from-bottom sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:pt-6 sm:shadow-mcm"
        >
          <div aria-hidden="true" className="h-0.75 w-10 self-center bg-border sm:hidden" />

          <div className="flex flex-col gap-1.5">
            <span className="label-caps text-secondary">
              {nav.signIn}
            </span>
            <Dialog.Title className="font-serif text-title font-bold">{connect.title}</Dialog.Title>
            <Dialog.Description className="text-ui text-muted-foreground">{connect.sheetLede}</Dialog.Description>
          </div>

          {isEnabled ? (
            <div className="flex flex-col gap-4">
              {state.accounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="label-caps">{connect.continueAs}</span>
                  <ul className="border-t border-foreground">
                    {state.accounts.map((acct) => {
                      const label = acct.displayName ? `${acct.displayName} (@${acct.handle})` : `@${acct.handle}`;
                      const isPending = loading && state.pending === acct.handle;
                      return (
                        <li key={acct.did} className="flex items-stretch border-b border-border bg-card">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void choose(acct)}
                            aria-label={connect.continueAsAccount(label)}
                            className="focus-ring-inset flex min-h-13 min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed"
                          >
                            <Avatar name={acct.displayName || acct.handle} avatar={acct.avatar} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              {acct.displayName && (
                                <span className="truncate font-serif text-ui font-bold text-foreground">
                                  {acct.displayName}
                                </span>
                              )}
                              <span className="truncate text-meta text-muted-foreground">@{acct.handle}</span>
                            </span>
                            <span className="shrink-0 label-caps font-bold text-secondary">
                              {isPending ? connect.connecting : '\u2192'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void forget(acct.did)}
                            aria-label={connect.forgetAccount(acct.handle)}
                            className="focus-ring-inset flex min-h-11 w-11 shrink-0 items-center justify-center border-l border-border font-condensed text-heading text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
                          >
                            &times;
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center gap-3 pt-1">
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    <span className="label-caps">{connect.orAnother}</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div className="relative flex flex-col gap-1.5">
                  <label className="flex flex-col gap-1.5">
                    <span
                      className={
                        errorMessage
                          ? 'label-caps text-destructive'
                          : 'label-caps'
                      }
                    >
                      {connect.label}
                    </span>
                    <input
                      type="text"
                      name="handle"
                      value={state.query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onKeyDown}
                      onBlur={closeSuggestions}
                      placeholder={connect.placeholder}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="url"
                      enterKeyHint="go"
                      disabled={loading}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={suggestionsOpen}
                      aria-controls={listboxId}
                      aria-activedescendant={
                        suggestionsOpen && state.activeIndex >= 0
                          ? `${listboxId}-opt-${state.activeIndex}`
                          : undefined
                      }
                      aria-invalid={!!errorMessage}
                      aria-describedby={errorMessage ? errorId : undefined}
                      className={cn('field', errorMessage && 'border-destructive')}
                    />
                  </label>

                  {suggestionsOpen && (
                    <ul
                      id={listboxId}
                      role="listbox"
                      aria-label={connect.suggestionsLabel}
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto border border-foreground bg-card shadow-bar"
                    >
                      {state.suggestions.map((suggestion, index) => (
                        <li
                          key={suggestion.did}
                          id={`${listboxId}-opt-${index}`}
                          role="option"
                          aria-selected={index === state.activeIndex}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => void choose(suggestion)}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0',
                            index === state.activeIndex ? 'bg-muted' : 'hover:bg-muted'
                          )}
                        >
                          <Avatar name={suggestion.displayName || suggestion.handle} avatar={suggestion.avatar} />
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

                  {errorMessage && (
                    <span id={errorId} role="alert" className="text-meta text-destructive">
                      {errorMessage}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !state.query.trim()}
                  className="btn btn-primary w-full disabled:cursor-not-allowed"
                >
                  {loading && state.action === 'sign-in' ? connect.connecting : connect.submit}
                </button>
              </form>

              <p className="flex items-center justify-center gap-1.5 border-t border-border pt-3 text-meta text-muted-foreground">
                <span>{connect.noAccountPrompt}</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void signUp()}
                  className="link-inline disabled:cursor-not-allowed"
                >
                  {loading && state.action === 'sign-up' ? connect.creating : connect.createAccount}
                </button>
              </p>
            </div>
          ) : (
            <Notice>{connect.disabled}</Notice>
          )}

          <Dialog.Close className="link-caps self-center px-2 text-muted-foreground transition-colors hover:text-foreground">
            {connect.guest}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
