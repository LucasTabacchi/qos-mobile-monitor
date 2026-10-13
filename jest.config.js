module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-paper$': '<rootDir>/__mocks__/react-native-paper.js',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/netinfo.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-reanimated|react-native-worklets)/)',
  ],
};
