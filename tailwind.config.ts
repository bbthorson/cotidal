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
      fontSize: {
        // `text-2xs` / `text-3xs` are used ~40 times across the app but were
        // never defined, so those elements silently rendered at inherited size.
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      fontFamily: {
        body: ['var(--font-pt-sans)', 'sans-serif'],
        headline: ['var(--font-playfair)', 'serif'],
        serif: ['var(--font-playfair)', 'serif'],
        condensed: ['var(--font-barlow)', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        amber: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFD54F',
          300: '#FFCA28',
          400: '#FFC107',
          500: '#D4941A',
          600: '#B7800F',
          700: '#8B6914',
          800: '#5D4610',
          900: '#3D2E0A',
        },
        copper: '#C47035',
        barrel: '#1A1D26',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
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
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.25rem',
        sm: 'calc(var(--radius) - 8px)',
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
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
