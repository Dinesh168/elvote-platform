// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // v2 app lives in src/. The old root app is linted when it is removed or ported.
    ignores: ['dist/*', 'backend/*', 'web/*', '*.js', 'components/*', 'screens/*', 'services/*', 'storemanagement/*', 'hooks/*', 'libs/*', 'utils/*', 'public/*'],
  },
]);
