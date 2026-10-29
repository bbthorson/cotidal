import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{astro,js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{astro,js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{astro,js,ts,jsx,tsx,mdx}',
    './src/lib/copy.ts',
  ],
  theme: {
    extend: {
      letterSpacing: {
        // Named so the brand's tracking is a decision made once, in one place,
        // rather than an arbitrary value re-typed per component.
        wordmark: '0.15em',
        label: '0.2em',
      },
      lineHeight: {
        display: '1.05',
      },
      aspectRatio: {
        '2/1': '2 / 1',
      },
      spacing: {
        'safe-b': 'max(env(safe-area-inset-bottom, 0px), 1rem)',
        // The phone's bottom tab bar: its 56px row plus `safe-b` beneath it.
        // Whatever sits above the bar (the drink card) or must clear it (the page's foot) uses this.
        'tabbar': 'calc(3.5rem + max(env(safe-area-inset-bottom, 0px), 1rem))',
        // 3px: the progress bar and the active tab's rule
        '0.75': '3px',
        // 7px: a drink on the map
        '1.75': '0.4375rem',
        // 18px: the padding inside a plate or the top-pick sheet
        '4.5': '1.125rem',
        // 22px: the rank column in a menu row
        '5.5': '1.375rem',
        // 52px: the height of a primary action on a phone
        '13': '3.25rem',
      },
      // `data-open:` for Radix parts, which mark themselves data-state="open".
      data: {
        open: 'state="open"',
      },
      borderWidth: {
        // The active tab's top rule
        '3': '3px',
      },
      fontSize: {
        // `text-2xs` / `text-3xs` are used ~40 times across the app but were
        // never defined, so those elements silently rendered at inherited size.
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        // The specimen-book type scale (docs/design-system.md). Named for the
        // role, so a size is chosen once rather than approximated per screen.
        meta: ['0.8125rem', { lineHeight: '1.5' }], // 13 · PT Sans small
        ui: ['0.9375rem', { lineHeight: '1.55' }], // 15 · PT Sans body
        prose: ['1.0625rem', { lineHeight: '1.6' }], // 17 · Playfair prose
        plate: ['1.1875rem', { lineHeight: '1.3' }], // 19 · option and drink names
        title: ['1.875rem', { lineHeight: '1.15' }], // 30 · a question, a drink
        hero: ['2.5rem', { lineHeight: '1.05' }], // 40 · landing headline on a phone
        // Not `reveal`: that is a colour, and a shared name emits both.
        region: ['3.5rem', { lineHeight: '1' }], // 56 · a region, revealed
      },
      fontFamily: {
        body: ['var(--font-pt-sans)', 'sans-serif'],
        headline: ['var(--font-playfair)', 'serif'],
        serif: ['var(--font-playfair)', 'serif'],
        condensed: ['var(--font-barlow)', 'sans-serif'],
        // Monospace is not a brand face. Anything still asking for it gets
        // Barlow, which carries every number in the system.
        mono: ['var(--font-barlow)', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: 'hsl(var(--accent))',
        destructive: 'hsl(var(--destructive))',
        reveal: {
          DEFAULT: 'hsl(var(--reveal))',
          foreground: 'hsl(var(--reveal-foreground))',
          muted: 'hsl(var(--reveal-muted))',
          mark: 'hsl(var(--reveal-mark))',
          trace: 'hsl(var(--reveal-trace))',
          rule: 'hsl(var(--reveal-rule))',
          hairline: 'hsl(var(--reveal-hairline))',
          dim: 'hsl(var(--reveal-dim))',
        },
        scrim: 'hsl(var(--scrim))',
        chart: {
          axis: 'hsl(var(--chart-axis))',
          ring: 'hsl(var(--chart-ring))',
          cross: 'hsl(var(--chart-cross))',
        },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
      // Square corners (docs/design-system.md, 04). Every named radius
      // resolves to 0 except `sm`, which is 2px and reserved for inputs;
      // `full` stays for the dots on the map.
      borderRadius: {
        DEFAULT: '0',
        sm: '2px',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
      },
      // Shadows for a paper ground. The previous set assumed obsidian: a hard
      // black drop and an amber glow, both of which read as dirt on cream.
      boxShadow: {
        // Letterpress-style hard offset, in terracotta.
        'mcm': '4px 4px 0px 0px hsl(8 55% 40%)',
        // A sheet lifted a millimetre off the stock.
        'bar': '0 1px 2px 0 hsl(40 20% 40% / 0.06), 0 8px 24px -12px hsl(40 20% 30% / 0.18)',
        // Was a glow. On paper the equivalent is an impression, not light.
        'glow': 'inset 0 0 0 1px hsl(41 29% 81%)',
      },
      keyframes: {
        // The one thing that moves on the reveal: the dot landing.
        land: {
          from: { opacity: '0', transform: 'translate(-50%, 50%) scale(2.4)' },
          to: { opacity: '1', transform: 'translate(-50%, 50%) scale(1)' },
        },
      },
      animation: {
        land: 'land 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.35s both',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
