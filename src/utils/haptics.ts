import { Vibration } from 'react-native';

/**
 * Haptic feedback abstraction.
 *
 * Currently a no-op on iOS + Vibration fallback on Android.
 * To upgrade to true Taptic Engine: `yarn add react-native-haptic-feedback`
 * + `cd ios && pod install`, then swap each helper body. Call sites don't change.
 */
export const haptics = {
  tap: () => Vibration.vibrate(10),
  select: () => Vibration.vibrate(10),
  success: () => Vibration.vibrate(20),
  warning: () => Vibration.vibrate([0, 10, 50, 10]),
  error: () => Vibration.vibrate([0, 20, 50, 20]),
};
