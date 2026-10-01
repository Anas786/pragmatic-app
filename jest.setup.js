/**
 * Jest environment setup — mocks for native modules the App tree touches.
 * Loaded via jest.config.js `setupFiles` (runs before the test framework).
 */

/* eslint-env jest */

// Gesture Handler ships its own jest setup (mocks the native module).
require('react-native-gesture-handler/jestSetup');

// Skia — official jest setup (mocks RNSkiaModule + the JS Skia API).
require('@shopify/react-native-skia/jestSetup');

// Reanimated 3 — official mock keeps worklets/entering animations inert.
// It lacks useReducedMotion / useFrameCallback (both "ADD ME IF NEEDED"),
// which the cold-start SplashOverlay uses; the frame callback stays inert.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    __esModule: true,
    ...mock,
    useReducedMotion: () => false,
    useFrameCallback: () => ({
      setActive: jest.fn(),
      isActive: false,
      callbackId: -1,
    }),
  };
});

// AsyncStorage — official in-memory mock (Amplify token store + zustand persist).
// Amplify's loadAsyncStorage() reads `.default` off the required module, so
// expose the mock both as default and as named members.
jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
  const impl = mock.default ?? mock;
  return { __esModule: true, default: impl, ...impl };
});

// NetInfo — official mock (App.tsx wires it to react-query's onlineManager).
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// Native-view libraries — render as plain Views in the test tree.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = props => React.createElement(View, props);
  return { __esModule: true, default: WebView, WebView };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: props => React.createElement(View, props),
  };
});

jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: props => React.createElement(View, props),
  };
});

// BackHandler — the iOS stub has no addEventListener, but react-navigation's
// useBackButton calls it on mount; RN ships a proper mock.
jest.mock('react-native/Libraries/Utilities/BackHandler', () =>
  require('react-native/Libraries/Utilities/__mocks__/BackHandler'),
);

// axios — tests must never hit the real network (the bootstrap fetch was
// reaching the live API). Requests hang forever, which is fine: nothing in
// the render test awaits them, and pending promises are not open handles.
jest.mock('axios', () => {
  const pending = () => new Promise(() => {});
  const instance = {
    get: jest.fn(pending),
    post: jest.fn(pending),
    put: jest.fn(pending),
    delete: jest.fn(pending),
    request: jest.fn(pending),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: { ...instance, create: jest.fn(() => instance) },
  };
});

// Reactotron — App.tsx requires ReactotronConfig under __DEV__ (true in Jest);
// the real package installs an XHR interceptor that needs a browser global.
jest.mock('reactotron-react-native', () => {
  const chain = {
    configure: jest.fn(() => chain),
    useReactNative: jest.fn(() => chain),
    use: jest.fn(() => chain),
    connect: jest.fn(() => chain),
    clear: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    display: jest.fn(),
  };
  return { __esModule: true, default: chain };
});

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue({ success: true }),
    shareSingle: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Official mock shipped with the package (the mock object is its default export).
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    lockToLandscape: jest.fn(),
    unlockAllOrientations: jest.fn(),
    addOrientationListener: jest.fn(),
    removeOrientationListener: jest.fn(),
  },
}));
