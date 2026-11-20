import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'TravioGhana-Supplier-staging',
    'travio-stays',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The codebase was ported from JavaScript; explicit `any` at component
      // boundaries is the migration seam (see README). Turn this on per-file as
      // types land.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // `// @ts-nocheck` is this repo's migration marker (see README), so it is
      // allowed on purpose. Every other ts-comment stays an error.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-nocheck': false }],
    },
  },
  {
    // Tests run in Node (fs, process) alongside the jsdom browser globals.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Phosphor is the app's icon family. Only the icon barrel may import it
    // directly; everything else goes through @/features/stays/icons.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/stays/icons/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@phosphor-icons/react',
              message: 'Import icons from @/features/stays/icons, not directly.',
            },
            {
              name: 'lucide-react',
              message: 'This app uses Phosphor. Import from @/features/stays/icons instead.',
            },
          ],
        },
      ],
    },
  },
])
