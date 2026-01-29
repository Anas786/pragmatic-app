/* eslint-disable no-undef */
import '@testing-library/jest-native/extend-expect';

// Mock react-native-css-interop BEFORE other mocks
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn((component) => component),
  remapProps: jest.fn((component) => component),
  StyleSheet: {
    create: (styles) => styles,
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    GestureHandlerRootView: View,
  };
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children }) => mockReact.createElement('View', {}, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock @react-navigation/native - complete mock without requireActual
jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({ children }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
      setParams: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
      key: 'test-key',
      name: 'TestScreen',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
    createNavigatorFactory: jest.fn(),
    DefaultTheme: {
      dark: false,
      colors: {
        primary: '#00D26A',
        background: '#0D0D0D',
        card: '#1A1A1A',
        text: '#FFFFFF',
        border: '#333333',
        notification: '#00D26A',
      },
    },
    DarkTheme: {
      dark: true,
      colors: {
        primary: '#00D26A',
        background: '#0D0D0D',
        card: '#1A1A1A',
        text: '#FFFFFF',
        border: '#333333',
        notification: '#00D26A',
      },
    },
  };
});

// Mock @react-navigation/native-stack
jest.mock('@react-navigation/native-stack', () => {
  const mockReact = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) => mockReact.createElement('View', {}, children),
      Screen: ({ children }) => mockReact.createElement('View', {}, children),
      Group: ({ children }) => mockReact.createElement('View', {}, children),
    }),
  };
});

// Mock @react-navigation/drawer
jest.mock('@react-navigation/drawer', () => {
  const mockReact = require('react');
  return {
    createDrawerNavigator: () => ({
      Navigator: ({ children }) => mockReact.createElement('View', {}, children),
      Screen: ({ children }) => mockReact.createElement('View', {}, children),
    }),
    useDrawerStatus: () => 'closed',
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => {
  const View = require('react-native').View;
  return {
    enableScreens: jest.fn(),
    Screen: View,
    ScreenContainer: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderCenterView: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderLeftView: View,
    SearchBar: View,
    FullWindowOverlay: View,
  };
});

// Mock nativewind
jest.mock('nativewind', () => ({
  styled: (component) => component,
  useColorScheme: () => ({ colorScheme: 'dark', setColorScheme: jest.fn() }),
  cssInterop: jest.fn((component) => component),
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const View = require('react-native').View;
  return {
    default: View,
    WebView: View,
  };
});

// Mock react-native-echarts-pro
jest.mock('react-native-echarts-pro', () => {
  const mockReact = require('react');
  const View = require('react-native').View;
  return {
    default: (props) => mockReact.createElement(View, { testID: 'echarts-mock', style: { height: props.height } }),
    __esModule: true,
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const View = require('react-native').View;
  return {
    default: View,
    Svg: View,
    Path: View,
    Defs: View,
    LinearGradient: View,
    Stop: View,
    Circle: View,
    Rect: View,
    G: View,
    Text: View,
    Line: View,
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('Animated: `useNativeDriver`') ||
    args[0]?.includes?.('componentWillReceiveProps') ||
    args[0]?.includes?.('componentWillMount')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global test timeout
jest.setTimeout(10000);
