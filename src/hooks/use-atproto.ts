import { useCallback, useEffect, useState } from 'react';

const isAtprotoEnabled = typeof process !== 'undefined'
  ? !!(process.env?.PUBLIC_ATPROTO_ENABLED || process.env?.ATPROTO_ENABLED || process.env?.NEXT_PUBLIC_ATPROTO_ENABLED)
  : !!(import.meta.env?.PUBLIC_ATPROTO_ENABLED || import.meta.env?.NEXT_PUBLIC_ATPROTO_ENABLED);


interface AtprotoState {
  isEnabled: boolean;
  isConnected: boolean;
  did: string | null;
  handle: string | null;
  displayName: string | null;
  connecting: boolean;
  error: string | null;
  connect: (handle: string) => Promise<void>;
  disconnect: () => void;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function useAtproto(): AtprotoState {
  const [did, setDid] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read connection state from cookies on mount and URL params
  useEffect(() => {
    if (!isAtprotoEnabled) return;

    // Read handle info from client-readable cookie
    const handleCookie = getCookie('atproto_handle');
    if (handleCookie) {
      try {
        const info = JSON.parse(handleCookie);
        setHandle(info.handle);
        setDisplayName(info.displayName);
        setDid('connected'); // We know we're connected but DID is in HTTP-only cookie
      } catch {
        // Invalid cookie
      }
    }

    // Check URL for connection result
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
    if (params.get('error')) {
      setError(params.get('error'));
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  const connect = useCallback(async (inputHandle: string) => {
    if (!isAtprotoEnabled) return;
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/atproto/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: inputHandle }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    deleteCookie('atproto_did');
    deleteCookie('atproto_handle');
    setDid(null);
    setHandle(null);
    setDisplayName(null);
    setError(null);
  }, []);

  return {
    isEnabled: isAtprotoEnabled,
    isConnected: !!did,
    did,
    handle,
    displayName,
    connecting,
    error,
    connect,
    disconnect,
  };
}
