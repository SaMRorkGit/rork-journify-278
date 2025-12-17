const { getDefaultConfig } = require('expo/metro-config');
const { withRorkMetro } = require('@rork-ai/toolkit-sdk/metro');

const config = getDefaultConfig(__dirname);

// Apply the withRorkMetro configuration
module.exports = withRorkMetro(config);
