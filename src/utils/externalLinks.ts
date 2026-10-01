import { Alert, Linking } from 'react-native';
import { display, inspectError } from './logger';

/**
 * What the device could not do, for the "Unable to open" alert — derived
 * from the URL scheme so the copy names the missing capability.
 */
export const unableToOpenMessage = (url: string): string => {
  const action = /^tel:/i.test(url)
    ? 'make calls'
    : /^mailto:/i.test(url)
    ? 'send email'
    : 'open this link';
  return `No app is available on this device to ${action}.`;
};

/**
 * Open a URL in the system handler (browser, Maps, Phone, Mail).
 *
 * No canOpenURL gating: on Android 11+ it returns false without a
 * <queries> manifest entry even when a handler exists. Catch-based
 * feedback only — openURL rejects when no app can handle the scheme.
 */
export const openExternalUrl = (url: string): void => {
  Linking.openURL(url).catch(err => {
    display('openExternalUrl ERROR', inspectError(err), undefined, true);
    Alert.alert('Unable to open', unableToOpenMessage(url));
  });
};
