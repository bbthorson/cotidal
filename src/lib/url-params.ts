/**
 * Take a one-off instruction from the URL and remove it, so a reload does not
 * repeat it. `true` when it was there. Browser only: on the server it is never there.
 */
export function takeParam(name: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return false;
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  return true;
}
