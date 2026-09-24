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

  /**
   * Token discipline is enforced strictly on everything written since the
   * rules were written down, and reported as a warning elsewhere so the ~86
   * pre-existing violations stay visible without blocking a commit.
   */
  {
    files: [
      'src/pages/**/*.{astro,ts,tsx}',
      'src/layouts/**/*.{astro,ts,tsx}',
      'src/components/**/*.{astro,ts,tsx}',
    ],
    ignores: [
      'src/components/ui/**',
      'src/components/app/**',
    ],
    rules: { 'no-restricted-syntax': ['error', ...tokenRuleEntries] },
  },
  {
    files: ['src/components/app/**/*.tsx'],
    rules: { 'no-restricted-syntax': ['warn', ...tokenRuleEntries] },
  },

  // Vendored shadcn/ui components: upstream code, kept close to source so it
  // can be re-synced. Not held to the token rules.
  {
    files: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
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
