const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const expoFlatConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];

const ignoredPaths = [
  'dist/**',
  '.expo/**',
  './.expo/**',
  '**/.expo/**',
  '.expo/types/**',
  './.expo/types/**',
  '**/.expo/types/**',
  '.expo/types/router.d.ts',
  './.expo/types/router.d.ts',
  '**/.expo/types/router.d.ts',
  'expo/types/**',
  './expo/types/**',
  '**/expo/types/**',
  'expo/types/router.d.ts',
  './expo/types/router.d.ts',
  '**/expo/types/router.d.ts',
];

const expoFlatConfigPatched = expoFlatConfig.map(config => ({
  ...config,
  ignores: [...(config.ignores ?? []), ...ignoredPaths],
  linterOptions: {
    ...(config.linterOptions ?? {}),
    reportUnusedDisableDirectives: false,
  },
}));

module.exports = defineConfig([
  {
    ignores: ignoredPaths,
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  ...expoFlatConfigPatched,
  {
    files: [
      '.expo/types/router.d.ts',
      './.expo/types/router.d.ts',
      '**/.expo/types/router.d.ts',
      'expo/types/router.d.ts',
      './expo/types/router.d.ts',
      '**/expo/types/router.d.ts',
    ],
    rules: {},
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
]);
