import { useEffect, useState } from 'react';
import { drinkEntryPath, type DrinkEntryData } from '@/lib/drink-entry';

const cache = new Map<string, DrinkEntryData | null>();

/**
 * A drink's write-up for the map's card: the one the server drew with the
 * page (`initial`), or fetched prerendered when a drink is opened, once per
 * drink. `null` while it loads, for a drink with no entry, or offline — the
 * card's head stands on its own.
 */
export function useDrinkEntry(slug: string | null, initial: DrinkEntryData | null = null): DrinkEntryData | null {
  if (initial && !cache.has(initial.slug)) cache.set(initial.slug, initial);
  const [entry, setEntry] = useState<DrinkEntryData | null>(() => (slug ? (cache.get(slug) ?? null) : null));

  useEffect(() => {
    if (!slug) {
      setEntry(null);
      return;
    }
    if (cache.has(slug)) {
      setEntry(cache.get(slug) ?? null);
      return;
    }
    setEntry(null);
    let live = true;
    fetch(drinkEntryPath(slug))
      .then((r) => (r.ok ? (r.json() as Promise<DrinkEntryData>) : null))
      .catch(() => null)
      .then((data) => {
        // A failed fetch is not remembered: it may work next time.
        if (data) cache.set(slug, data);
        if (live) setEntry(data);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  return entry;
}
