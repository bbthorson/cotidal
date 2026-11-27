import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge knows Tailwind's own scale, not ours. Untold, it reads
 * `text-prose` or `text-title` as a colour and drops it when a colour class
 * follows (`text-title … text-foreground`), so a drink name rendered at body
 * size. These are the `fontSize` keys in tailwind.config.ts
 * (tests/unit/class-merge.test.ts holds the two lists equal).
 */
export const FONT_SIZES = [
  "label",
  "meta",
  "ui",
  "field",
  "prose",
  "plate",
  "heading",
  "subtitle",
  "title",
  "display",
  "display-lg",
  "hero",
  "hero-lg",
  "region",
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
