import { Platform, Vibration } from 'react-native';

/**
 * Haptic feedback abstraction.
 *
 * iOS is a TRUE no-op: RN's `Vibration.vibrate` has no intensity/duration
 * control on iOS — it fires the full ~400ms system buzz, which is jarring on
 * every tap (shipped that way once; customers felt it on every interaction).
 * Android keeps the short vibration fallback, guarded because feedback is
 * best-effort — it must never crash the app.
 *
 * To upgrade to true Taptic Engine: `yarn add react-native-haptic-feedback`
 * + `cd ios && pod install`, then swap each helper body. Call sites don't change.
 */
const vibrate = (pattern: number | number[]) => {
  if (Platform.OS !== 'android') return;
  try {
    Vibration.vibrate(pattern);
  } catch {
    // Missing VIBRATE permission or device policy — silently skip.
  }
};

export const haptics = {
  tap: () => vibrate(10),
  select: () => vibrate(10),
  success: () => vibrate(20),
  warning: () => vibrate([0, 10, 50, 10]),
  error: () => vibrate([0, 20, 50, 20]),
};
