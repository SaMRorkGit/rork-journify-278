const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const expoFlatConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];

const ignoredPaths = [
  "dist/**",
  ".expo/**",
  "**/.expo/**",
  ".expo/types/router.d.ts",
  "**/.expo/types/router.d.ts",
];

const expoFlatConfigPatched = expoFlatConfig.map(config => ({
  ...config,
  ignores: [...(config.ignores ?? []), ...ignoredPaths],
  linterOptions: {
    ...(config.linterOptions ?? {}),
    reportUnusedDisableDirectives: "off",
  }
}));

module.exports = defineConfig([
  {
    ignores: ignoredPaths,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  ...expoFlatConfigPatched,
  {
    files: [".expo/types/router.d.ts", "**/.expo/types/router.d.ts"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
]);
