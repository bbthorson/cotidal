import { useEffect, useState } from 'react';

const cache = new Map<string, unknown>();

/**
 * A write-up the map's card shows — a drink's (`drinkEntryPath`) or a
 * region's (`regionEntryPath`): the one the server drew with the page
 * (`initial`, at its path), or fetched prerendered when it is opened, once
 * per path. `null` while it loads, for one with no entry, or offline — the
 * card's head stands on its own.
 */
export function usePrerendered<T>(path: string | null, initial: { path: string; data: T } | null = null): T | null {
  if (initial && !cache.has(initial.path)) cache.set(initial.path, initial.data);
  const [data, setData] = useState<T | null>(() => (path ? ((cache.get(path) as T | undefined) ?? null) : null));

  useEffect(() => {
    if (!path) {
      setData(null);
      return;
    }
    if (cache.has(path)) {
      setData(cache.get(path) as T);
      return;
    }
    setData(null);
    let live = true;
    fetch(path)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null)
      .then((value) => {
        // A failed fetch is not remembered: it may work next time.
        if (value) cache.set(path, value);
        if (live) setData(value);
      });
    return () => {
      live = false;
    };
  }, [path]);

  return data;
}
