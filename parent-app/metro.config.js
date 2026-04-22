const path = require('path');
const { withNativeWind } = require('nativewind/metro');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure react-native-css-interop is always resolvable from anywhere in the tree,
// including from inside node_modules/@react-navigation which gets its React.createElement
// calls transformed by the css-interop babel plugin.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });