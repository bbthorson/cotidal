import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { NOMINAL_SIDE } from '@/lib/map/map-draw';

/** The plane's side in pixels, once the page runs; `NOMINAL_SIDE` until then. */
export function useSide(box: RefObject<HTMLDivElement | null>): number {
  const [side, setSide] = useState(NOMINAL_SIDE);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setSide(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return side;
}

/**
 * The width of a label as the map sets it (PT Sans at the meta size): an
 * estimate on the server and until fonts are in, so the first page the
 * browser draws is the one the server sent, then measured.
 */
export function useTextMeasure() {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return useMemo(
    () => (text: string) => {
      if (!ready || typeof document === 'undefined') return text.length * 7;
      ctx.current ??= document.createElement('canvas').getContext('2d');
      if (!ctx.current) return text.length * 7;
      ctx.current.font = `700 13px ${getComputedStyle(document.body).getPropertyValue('--font-pt-sans') || 'PT Sans'}, sans-serif`;
      return ctx.current.measureText(text).width;
    },
    [ready]
  );
}
