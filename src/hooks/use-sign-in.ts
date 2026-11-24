import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAuthClient,
  createSignInController,
  type AuthError,
  type HandleSuggestion,
  type RecentAccount,
  type SignInController,
  type SignInState,
} from '@bbthorson/atproto-cf-auth/client';
import { getRecentAccounts } from '@/lib/atproto/accounts';
import { AUTH_BASE_PATH } from '@/lib/atproto/paths';

const INITIAL_STATE: SignInState = {
  query: '',
  suggestions: [],
  activeIndex: -1,
  accounts: [],
  status: 'idle',
  error: null,
  pending: null,
  action: null,
};

/**
 * Everything the in-app sign-in sheet knows and can do, backed by
 * `@bbthorson/atproto-cf-auth`'s `createSignInController`: remembered accounts,
 * debounced handle typeahead, normalisation, validation, in-flow sign-up
 * (`prompt=create`), and bfcache recovery.
 */
export function useSignIn(enabled: boolean, initialError: AuthError | null = null) {
  const controllerRef = useRef<SignInController | null>(null);
  const [state, setState] = useState<SignInState>(() =>
    initialError ? { ...INITIAL_STATE, status: 'error', error: initialError } : INITIAL_STATE
  );

  useEffect(() => {
    if (!enabled) {
      controllerRef.current = null;
      setState(INITIAL_STATE);
      return;
    }

    const client = createAuthClient({ basePath: AUTH_BASE_PATH });
    const controller = createSignInController({
      signIn: (handle) => client.signIn(handle, { returnTo: window.location.pathname }),
      signUp: () => client.signUp({ returnTo: window.location.pathname }),
      accounts: getRecentAccounts(),
      typeahead: true,
    });
    controllerRef.current = controller;

    if (initialError) {
      controller.setError(initialError);
    }
    setState(controller.getState());

    const unsubscribe = controller.subscribe(() => {
      setState(controller.getState());
    });

    return () => {
      unsubscribe();
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [enabled, initialError]);

  const setQuery = useCallback((query: string) => controllerRef.current?.setQuery(query), []);
  const moveActive = useCallback((delta: number) => controllerRef.current?.moveActive(delta), []);
  const setActive = useCallback((index: number) => controllerRef.current?.setActive(index), []);
  const closeSuggestions = useCallback(() => controllerRef.current?.closeSuggestions(), []);
  const submit = useCallback(() => controllerRef.current?.submit() ?? Promise.resolve(), []);
  const signUp = useCallback(() => controllerRef.current?.signUp() ?? Promise.resolve(), []);
  const choose = useCallback(
    (account: HandleSuggestion | RecentAccount) => controllerRef.current?.choose(account) ?? Promise.resolve(),
    []
  );
  const forget = useCallback((did: string) => controllerRef.current?.forget(did) ?? Promise.resolve(), []);

  return {
    state,
    setQuery,
    moveActive,
    setActive,
    closeSuggestions,
    submit,
    signUp,
    choose,
    forget,
  };
}
