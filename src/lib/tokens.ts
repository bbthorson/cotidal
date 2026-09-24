/**
 * Type-Safe Design Tokens Module
 *
 * Single source of truth for design tokens used in runtime logic
 * (SVG canvas, Recharts, OpenGraph generation, and dynamic styling).
 *
 * The CSS custom properties in `src/styles/globals.css` and the Tailwind
 * theme in `tailwind.config.ts` mirror these exact definitions.
 * See docs/design-system.md.
 */

export interface ColorToken {
  /** CSS custom property value (channels only, e.g. "47 39% 93%") */
  readonly raw: string;
  /** Complete CSS HSL expression */
  readonly hsl: string;
  /** Exact hex color equivalent */
  readonly hex: string;
  /** Exact RGB expression equivalent */
  readonly rgb: string;
  /** Purpose and brand role */
  readonly role: string;
}

export const colors = {
  background: {
    raw: '47 39% 93%',
    hsl: 'hsl(47, 39%, 93%)',
    hex: '#F4F1E6',
    rgb: 'rgb(244, 241, 230)',
    role: 'Warm paper ground stock',
  },
  card: {
    raw: '45 50% 97%',
    hsl: 'hsl(45, 50%, 97%)',
    hex: '#FAF8F2',
    rgb: 'rgb(250, 248, 242)',
    role: 'Brighter specimen sheet laid on ground',
  },
  foreground: {
    raw: '148 20% 17%',
    hsl: 'hsl(148, 20%, 17%)',
    hex: '#23342B',
    rgb: 'rgb(35, 52, 43)',
    role: 'Forest ink — near-black, but green',
  },
  primary: {
    raw: '8 55% 40%',
    hsl: 'hsl(8, 55%, 40%)',
    hex: '#9E3E2F',
    rgb: 'rgb(158, 62, 47)',
    role: 'Terracotta — the accent that carries',
  },
  secondary: {
    raw: '140 22% 24%',
    hsl: 'hsl(140, 22%, 24%)',
    hex: '#30493B',
    rgb: 'rgb(48, 73, 59)',
    role: 'Deep forest — buttons, badges, active tabs',
  },
  accent: {
    raw: '80 24% 76%',
    hsl: 'hsl(80, 24%, 76%)',
    hex: '#C6D1B2',
    rgb: 'rgb(198, 209, 178)',
    role: 'Sage mass',
  },
  border: {
    raw: '41 29% 81%',
    hsl: 'hsl(41, 29%, 81%)',
    hex: '#D6CEBA',
    rgb: 'rgb(214, 206, 186)',
    role: 'Tan hairline border',
  },
  muted: {
    raw: '41 29% 88%',
    hsl: 'hsl(41, 29%, 88%)',
    hex: '#E7E2D5',
    rgb: 'rgb(231, 226, 213)',
    role: 'Tan wash of the ground',
  },
  mutedForeground: {
    raw: '125 6% 39%',
    hsl: 'hsl(125, 6%, 39%)',
    hex: '#5D6A61',
    rgb: 'rgb(93, 106, 97)',
    role: 'Warm grey-green for metadata & glosses',
  },
  destructive: {
    raw: '0 65% 42%',
    hsl: 'hsl(0, 65%, 42%)',
    hex: '#B12828',
    rgb: 'rgb(177, 40, 40)',
    role: 'Muted crimson error state',
  },
  chart1: {
    raw: '8 55% 40%',
    hsl: 'hsl(8, 55%, 40%)',
    hex: '#9E3E2F',
    rgb: 'rgb(158, 62, 47)',
    role: 'Chart series 1 (Terracotta)',
  },
  chart2: {
    raw: '140 22% 24%',
    hsl: 'hsl(140, 22%, 24%)',
    hex: '#30493B',
    rgb: 'rgb(48, 73, 59)',
    role: 'Chart series 2 (Deep Forest)',
  },
  chart3: {
    raw: '37 76% 45%',
    hsl: 'hsl(37, 76%, 45%)',
    hex: '#C77D1E',
    rgb: 'rgb(199, 125, 30)',
    role: 'Chart series 3 (Warm Ochre)',
  },
  chart4: {
    raw: '80 24% 56%',
    hsl: 'hsl(80, 24%, 56%)',
    hex: '#8C9B73',
    rgb: 'rgb(140, 155, 115)',
    role: 'Chart series 4 (Muted Olive)',
  },
  chart5: {
    raw: '10 45% 62%',
    hsl: 'hsl(10, 45%, 62%)',
    hex: '#C77E71',
    rgb: 'rgb(199, 126, 113)',
    role: 'Chart series 5 (Warm Rose-Clay)',
  },
} as const satisfies Record<string, ColorToken>;

export type ColorTokenName = keyof typeof colors;

export const typography = {
  fonts: {
    serif: "'Playfair Display', serif",
    body: "'PT Sans', sans-serif",
    condensed: "'Barlow Condensed', sans-serif",
    code: "monospace",
  },
  tracking: {
    wordmark: '0.15em',
    label: '0.2em',
    normal: '0em',
  },
  lineHeight: {
    display: '1.05',
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  fontSize: {
    '3xs': '0.625rem', // 10px
    '2xs': '0.6875rem', // 11px
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
} as const;

export const shadows = {
  /** A sheet lifted a millimetre off paper stock */
  bar: '0 1px 2px 0 hsl(40 20% 40% / 0.06), 0 8px 24px -12px hsl(40 20% 30% / 0.18)',
  /** Letterpress-style hard offset, in terracotta */
  mcm: '4px 4px 0px 0px hsl(8 55% 40%)',
  /** Letterpress impression, hairline edge rather than light halo */
  glow: 'inset 0 0 0 1px hsl(41 29% 81%)',
} as const;

export const radii = {
  none: '0px',
  sm: '0.25rem', // 4px
  md: '0.5rem',  // 8px
  lg: '0.75rem', // 12px
} as const;

/**
 * Returns a CSS color string with optional alpha channel.
 * Example: `alphaColor('primary', 0.2)` -> `'hsl(8 55% 40% / 0.2)'`
 */
export function alphaColor(token: ColorTokenName, alpha: number): string {
  const t = colors[token];
  return `hsl(${t.raw} / ${alpha})`;
}

/**
 * Global token dictionary object
 */
export const tokens = {
  colors,
  typography,
  shadows,
  radii,
  alphaColor,
} as const;

export default tokens;
