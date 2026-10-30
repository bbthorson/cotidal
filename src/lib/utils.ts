import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge knows Tailwind's own scale, not ours. Untold, it reads
 * `text-prose` or `text-title` as a colour and drops it when a colour class
 * follows (`text-title … text-foreground`), so a drink name rendered at body
 * size. These are the `fontSize` keys in tailwind.config.ts
 * (tests/class-merge.spec.ts holds the two lists equal).
 */
export const FONT_SIZES = [
  "3xs",
  "2xs",
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
