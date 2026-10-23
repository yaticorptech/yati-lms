import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // public/loop-walker is the vendored Loop Walker runtime: as shipped, apart
  // from the edits marked "YATICORP change" (phone size, sharpness, buttons, same size up and down the screen).
  // android/ and ios/ hold the native projects, with a built copy of the app
  // in their assets: linting those bundles ran ESLint out of memory. The
  // vendored native plugin's dist/ is its own build output too.
  globalIgnores(['dist', 'public/loop-walker', 'android', 'ios', 'native-plugins/*/dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
