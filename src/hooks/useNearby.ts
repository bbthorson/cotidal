import { useCallback, useEffect, useState } from 'react';
import { barsNear, type OsmBar } from '@/lib/drinks/osm';

/**
 * `denied` is the reader's no, and only that; `unlocated` is the device not
 * finding itself in time, which a retry can fix; `failed` is OpenStreetMap.
 */
export type NearbyStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unlocated' | 'failed';

/**
 * Bars near you, from OpenStreetMap. Nothing is asked for until the reader
 * asks — unless the browser already holds their yes for this site, in which
 * case the map opens on its own. The point leaves the device rounded
 * (`barsNear`), and only to OpenStreetMap.
 */
export function useNearby() {
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [you, setYou] = useState<{ lat: number; lon: number } | null>(null);
  const [bars, setBars] = useState<OsmBar[]>([]);
  // A new search is a new map.
  const [search, setSearch] = useState(0);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('denied');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          setBars(await barsNear(point));
          setYou(point);
          setSearch((n) => n + 1);
          setStatus('ready');
        } catch (e) {
          console.error('Bars near you:', e);
          setStatus('failed');
        }
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unlocated'),
      { timeout: 20_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => p.state === 'granted' && locate())
      .catch(() => {});
  }, [locate]);

  return { status, you, bars, search, locate };
}

export type Nearby = ReturnType<typeof useNearby>;
