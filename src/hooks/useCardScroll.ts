import { useEffect, useRef, type RefObject } from 'react';

/**
 * Scroll management when `/map`'s card switches modes:
 * - On desktop (`lg`+), the card body scrolls independently to its top.
 * - On phones, rating pulls the card up (`cardUp`), while map-focused modes
 *   scroll back to the top of the page so the map shows.
 */
export function useCardScroll(
  cardKey: string,
  cardUp: boolean,
  cardRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLDivElement | null>
) {
  const arrived = useRef(false);
  useEffect(() => {
    // The first card is where the page already is: nothing to scroll to.
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (window.matchMedia('(min-width: 1024px)').matches) {
      bodyRef.current?.scrollTo({ top: 0, behavior });
      return;
    }
    if (cardUp && cardRef.current) {
      window.scrollTo({ top: window.scrollY + cardRef.current.getBoundingClientRect().top, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [cardKey, cardUp, cardRef, bodyRef]);
}
