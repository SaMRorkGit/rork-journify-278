const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const expoFlatConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];

module.exports = defineConfig([
  {
    ignores: ["dist/**", ".expo/**"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  ...expoFlatConfig,
]);
