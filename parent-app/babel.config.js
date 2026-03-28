module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    overrides: [
      {
        // Only apply NativeWind's babel transforms to source files, not pre-compiled node_modules.
        // The css-interop babel plugin injects `import ... from 'react-native-css-interop'` into
        // any file using React.createElement, which breaks metro resolution from inside node_modules.
        exclude: /node_modules/,
        presets: ['nativewind/babel'],
      },
    ],
  };
};
