import '@testing-library/jest-native/extend-expect';

// ─── expo-secure-store ────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-splash-screen ───────────────────────────────────────────────────────
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-constants ───────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { apiUrl: 'http://localhost' } },
  },
}));

// ─── @expo/vector-icons ───────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID, ...props }: any) =>
      require('react').createElement(Text, { testID: testID ?? `icon-${name}`, ...props }, name),
  };
});

// ─── expo-router ──────────────────────────────────────────────────────────────
// mockRouter and mockNavigation live inside the factory to avoid Jest's
// babel-jest hoisting putting the const declarations in the TDZ.
// Tests access them via: const { __mockRouter } = jest.requireMock('expo-router')
jest.mock('expo-router', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const React = require('react');

  const __mockRouter = {
    replace: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  };

  const __mockNavigation = {
    setOptions: jest.fn(),
  };

  return {
    __mockRouter,
    __mockNavigation,
    useRouter: () => __mockRouter,
    useNavigation: () => __mockNavigation,
    useSegments: jest.fn(() => []),
    Link: ({ href, children, style }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress: () => __mockRouter.navigate(href) },
        React.createElement(Text, { style }, children),
      ),
    Stack: Object.assign(
      ({ children }: any) => React.createElement(View, null, children),
      { Screen: ({ name, ...props }: any) => React.createElement(View, null) },
    ),
    Tabs: Object.assign(
      ({ children }: any) => React.createElement(View, null, children),
      { Screen: ({ name, ...props }: any) => React.createElement(View, null) },
    ),
  };
});

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});
