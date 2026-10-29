import { useEffect, useRef } from 'react';
import type { CircleMarker, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OsmBar } from '@/lib/osm';
import { compass } from '@/lib/copy';

/** A design token as a colour Leaflet can paint with (its markers are SVG, styled in JS). */
const token = (name: string) => `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;

/**
 * The street map on Compass: you, and the bars OpenStreetMap knows around
 * you. Its tiles are washed toward paper (`.map-paper` in globals.css) so it
 * reads as quieter than the taste chart on Log — two maps in one app should
 * not look alike. Bars you have poured at are marked in terracotta, the
 * colour for what is yours.
 *
 * Leaflet is loaded only when this mounts, so Compass without the map
 * ships none of it.
 */
export function NearMap({
  you,
  bars,
  known,
  selected,
  onSelect,
}: {
  you: { lat: number; lon: number };
  bars: OsmBar[];
  /** Ids of the bars you have poured at. */
  known: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, CircleMarker>());
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    const drawn = markers.current;
    void import('leaflet').then((L) => {
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([you.lat, you.lon], 16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      L.control.zoom({ position: 'bottomright' }).addTo(m);
      // OpenStreetMap's credit is required and stays; Leaflet's own is not.
      m.attributionControl.setPrefix(false);

      const ink = token('--foreground');
      const yours = token('--primary');
      const paper = token('--card');

      for (const bar of bars) {
        const mine = known.has(bar.id);
        const marker = L.circleMarker([bar.lat, bar.lon], {
          radius: 7,
          weight: 2,
          color: mine ? yours : ink,
          fillColor: mine ? yours : paper,
          fillOpacity: 1,
        })
          .addTo(m)
          .bindTooltip(bar.name, { direction: 'top', offset: [0, -6] })
          .on('click', () => select.current(bar.id));
        drawn.set(bar.id, marker);
      }
      // You: the terracotta dot with a paper ring, as on the chart.
      L.circleMarker([you.lat, you.lon], { radius: 6, weight: 3, color: paper, fillColor: yours, fillOpacity: 1, interactive: false })
        .bindTooltip(compass.you)
        .addTo(m);

      if (bars.length > 0) {
        const near = bars.slice(0, 12).map((b) => [b.lat, b.lon] as [number, number]);
        m.fitBounds(L.latLngBounds([[you.lat, you.lon], ...near]).pad(0.15), { maxZoom: 17 });
      }
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      drawn.clear();
    };
    // Drawn once per search: a new search remounts the map (keyed by the caller).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The selected bar: larger, and centred if it is off screen.
  useEffect(() => {
    for (const [id, marker] of markers.current) marker.setRadius(id === selected ? 11 : 7);
    const marker = selected ? markers.current.get(selected) : null;
    if (marker && map.current && !map.current.getBounds().contains(marker.getLatLng())) map.current.panTo(marker.getLatLng());
  }, [selected]);

  return <div ref={el} role="region" aria-label={compass.mapLabel} className="map-paper h-full w-full" />;
}
