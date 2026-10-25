import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * The recurring failure in this codebase is a second, hard-coded copy of
 * something that already has a source of truth — and every instance of it so
 * far has failed *silently*: `text-2xs` used 41 times but defined nowhere,
 * `font-body` pointing at a CSS variable that did not exist, a Zod schema and
 * a lexicon describing different records.
 *
 * The design rules in docs/brand.md are only real if they are enforced, so
 * the token rules below are the point of this config.
 */

/** Tailwind arbitrary values: `bg-[#hex]`, `text-[13px]`, `shadow-[0_0_…]`. */
const ARBITRARY_VALUE = /(^|\s)-?[a-z][a-zA-Z-]*-\[[^\]]+\]/;

/** A raw colour anywhere in a class string. */
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

/**
 * A colour faded on the spot: `text-foreground/80`, `border-border/60`. Text is
 * de-emphasised by size and weight, never opacity (docs/design-system.md), and
 * a translucent rule or scrim is a named token in globals.css. Fractions such
 * as `w-1/2` and `-translate-x-1/2` are not colours and do not match.
 */
const OPACITY_MODIFIER =
  /(^|[\s:])(text|bg|border(-[trblxy])?|ring|ring-offset|outline|fill|stroke|divide|decoration|shadow|from|via|to|accent|caret|placeholder)-[a-z][a-z0-9-]*\/\d+(\s|$)/;

/** A focus ring drawn by hand, which the base `:focus-visible` rule already draws. */
const HAND_FOCUS = /focus-visible:(ring|outline)/;

/** The primary button spelled out: forest with a terracotta hover. */
const HAND_PRIMARY = /bg-secondary\b.*hover:bg-primary\b|hover:bg-primary\b.*bg-secondary\b/;

const COMPONENT_MESSAGE =
  'Use the design system class, not its parts: focus is drawn once by ' +
  '`:focus-visible` in globals.css (add focus-ring-inset or focus-ring-reveal ' +
  'for a variant), and the primary button is `btn btn-primary` (or ' +
  '`btn btn-reveal`, with `btn-lg` for the large size).';

const TOKEN_MESSAGE =
  'Use a design token, not a literal. Colours, sizes and shadows belong in ' +
  'globals.css / tailwind.config.ts — see docs/brand.md. If the token you ' +
  'need does not exist, add it there first.';

/**
 * Matches className="…" and class="…" on JSX and Astro elements. Template
 * literals and cn(…) calls are checked through the Literal selector too.
 */
const tokenRuleEntries = [
  {
    selector: `Literal[value=/${ARBITRARY_VALUE.source}/]`,
    message: TOKEN_MESSAGE,
  },
  {
    selector: `Literal[value=/${RAW_COLOR.source}/]`,
    message: TOKEN_MESSAGE,
  },
  {
    selector: `TemplateElement[value.raw=/${ARBITRARY_VALUE.source}/]`,
    message: TOKEN_MESSAGE,
  },
  {
    selector: `Literal[value=/${OPACITY_MODIFIER.source}/]`,
    message: TOKEN_MESSAGE,
  },
  {
    selector: `TemplateElement[value.raw=/${OPACITY_MODIFIER.source}/]`,
    message: TOKEN_MESSAGE,
  },
  ...[HAND_FOCUS, HAND_PRIMARY].flatMap((pattern) => [
    { selector: `Literal[value=/${pattern.source}/]`, message: COMPONENT_MESSAGE },
    { selector: `TemplateElement[value.raw=/${pattern.source}/]`, message: COMPONENT_MESSAGE },
  ]),
];

export default [
  {
    ignores: [
      'node_modules/**',
      '.astro/**',
      'dist/**',
      'build/**',
      '.wrangler/**',
      'package-lock.json',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // React hooks — the quiz flow leans on effect ordering, so exhaustive-deps
  // violations here are real bugs rather than noise.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Token discipline, as an error on every page, layout and component.
  {
    files: [
      'src/pages/**/*.{astro,ts,tsx}',
      'src/layouts/**/*.{astro,ts,tsx}',
      'src/components/**/*.{astro,ts,tsx}',
    ],
    rules: { 'no-restricted-syntax': ['error', ...tokenRuleEntries] },
  },

  /**
   * `src/env.d.ts` is Astro's ambient-types entry point and a triple-slash
   * reference is the only way to pull in `.astro/types.d.ts`, which is
   * generated (and gitignored) rather than importable. Without it the content
   * collection resolves as `any` in every page that reads it.
   */
  {
    files: ['src/env.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },

  {
    files: ['tests/**/*.ts', 'scripts/**/*.mjs', '*.config.{ts,mjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
