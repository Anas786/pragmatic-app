module.exports = {
  preset: 'react-native',
  // NOTE: this REPLACES the preset's setupFiles (Jest doesn't merge arrays),
  // so react-native's own jest/setup.js must be listed explicitly.
  setupFiles: ['react-native/jest/setup.js', './jest.setup.js'],
  // The RN preset only transforms react-native + @react-native(-community)
  // out of the box. Everything the app tree pulls in that ships untranspiled
  // ESM/Flow/TS must be allowlisted here or Jest fails to parse it
  // ("Cannot use import statement outside a module").
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-.*|@react-navigation/.*|@aws-amplify/.*|aws-amplify|@shopify/react-native-skia|lottie-react-native|react-native-vector-icons|uuid)/)',
  ],
};
