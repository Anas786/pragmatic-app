/**
 * App shell screens, rendered:
 *  - Drawer content: safe skeleton instead of placeholder identity, row
 *    navigation into DashboardStack, the active-route highlight, the
 *    Appearance radio group driving the theme preference, version footer.
 *  - Login: autofill / return-key semantics on the fields, dark-ink CTA,
 *    failures as an inline banner (never a native Alert) with the ERROR
 *    haptic, the new-password checklist + confirm match, "Use a different
 *    account", and the Terms link.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import React from 'react';
import renderer, { ReactTestInstance } from 'react-test-renderer';
import { Alert, Text, TextInput } from 'react-native';
import { AuthError } from 'aws-amplify/auth';
import { LocaleDirContext } from '@react-navigation/native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DARK_SCHEME } from '../src/theme';
import { useThemeStore } from '../src/hooks/useThemeStore';
import { useUserStore } from '../src/hooks/useUserStore';
import { APP_VERSION_LABEL } from '../src/utils/constants/app';
import { jwt } from './fixtures/cognitoSession';

/* ───────────────────────── mocks ───────────────────────── */

type AnyFn = (...args: any[]) => any;

const mockNav = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
  goBack: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  ...(jest.requireActual('@react-navigation/native') as object),
  useNavigation: () => mockNav,
}));

jest.mock('../src/networking', () => {
  const cognito = jest.requireActual('../src/networking/auth/cognito') as {
    cognitoErrorMessage: (e: unknown) => string;
  };
  return {
    cognitoErrorMessage: cognito.cognitoErrorMessage,
    cognitoSignIn: jest.fn(),
    cognitoConfirmNewPassword: jest.fn(),
    cognitoGetTokens: jest.fn(),
    cognitoSignOut: jest.fn(() => Promise.resolve()),
    executeLogout: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../src/utils/haptics', () => ({
  haptics: {
    tap: jest.fn(),
    select: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

const networking = jest.requireMock('../src/networking') as Record<
  'cognitoSignIn' | 'cognitoConfirmNewPassword' | 'cognitoGetTokens' | 'cognitoSignOut',
  Mock<AnyFn>
>;
const { haptics } = jest.requireMock('../src/utils/haptics') as {
  haptics: Record<'success' | 'error' | 'select', Mock<AnyFn>>;
};

// Imported after the mocks.
import Login from '../src/components/screens/Onboarding/Login';
import { CustomDrawerContent } from '../src/routes/drawerNavigator';

/* ───────────────────────── helpers ───────────────────────── */

const flush = () =>
  renderer.act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });

/** The tappable (composite with onPress) carrying this a11y label. */
const tappable = (root: ReactTestInstance, label: string) =>
  root.find(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function' &&
      typeof n.type !== 'string',
  );

const press = (root: ReactTestInstance, label: string) =>
  renderer.act(() => {
    tappable(root, label).props.onPress();
  });

const hostWithLabel = (root: ReactTestInstance, label: string) =>
  root.findAll(n => n.props.accessibilityLabel === label && n.props.accessibilityState);

const allText = (root: ReactTestInstance): string =>
  root
    .findAllByType(Text)
    .map(t => {
      const c = t.props.children;
      return Array.isArray(c) ? c.filter(x => typeof x === 'string').join('') : String(c ?? '');
    })
    .join(' | ');

const input = (root: ReactTestInstance, testID: string) =>
  root.findAllByType(TextInput).find(n => n.props.testID === testID)!;

const type = (root: ReactTestInstance, testID: string, text: string) =>
  renderer.act(() => {
    input(root, testID).props.onChangeText(text);
  });

const USER = {
  user_id: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
};

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ user: null });
  useThemeStore.getState().setPreference('dark');
});

/* ───────────────────────── drawer ───────────────────────── */

describe('drawer content', () => {
  const nav = { closeDrawer: jest.fn(), navigate: jest.fn() };

  const drawerState = (nested?: object) =>
    ({
      stale: false,
      type: 'drawer',
      key: 'drawer-1',
      index: 0,
      routeNames: ['DashboardStack'],
      history: [],
      default: 'closed',
      routes: [
        { key: 'DashboardStack-1', name: 'DashboardStack', params: undefined, state: nested },
      ],
    }) as unknown as DrawerContentComponentProps['state'];

  const renderDrawer = (nested?: object) => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <LocaleDirContext.Provider value="ltr">
          <CustomDrawerContent
            navigation={nav as unknown as DrawerContentComponentProps['navigation']}
            state={drawerState(nested)}
            descriptors={{}}
          />
        </LocaleDirContext.Provider>,
      );
    });
    return tree;
  };

  afterEach(() => {
    nav.closeDrawer.mockClear();
    nav.navigate.mockClear();
  });

  it('shows a skeleton — never placeholder identity — before the user loads', () => {
    const tree = renderDrawer();
    expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Loading profile').length).toBeGreaterThan(0);
    const text = allText(tree.root);
    expect(text).not.toMatch(/\bUser\b/);
    expect(text).not.toContain('user@email.com');
    tree.unmount();
  });

  it('opens the profile from the identity row', () => {
    useUserStore.setState({ user: USER });
    const tree = renderDrawer();
    expect(allText(tree.root)).toContain('Ada Lovelace');
    expect(allText(tree.root)).toContain('ada@example.com');
    press(tree.root, 'View profile, Ada Lovelace');
    expect(nav.closeDrawer).toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith('DashboardStack', { screen: 'Profile' });
    tree.unmount();
  });

  it('pushes the support screens onto DashboardStack', () => {
    useUserStore.setState({ user: USER });
    const tree = renderDrawer();
    press(tree.root, 'Contact us');
    expect(nav.navigate).toHaveBeenLastCalledWith('DashboardStack', { screen: 'ContactUs' });
    press(tree.root, 'About');
    expect(nav.navigate).toHaveBeenLastCalledWith('DashboardStack', { screen: 'AboutUs' });
    press(tree.root, 'Terms & Conditions');
    expect(nav.navigate).toHaveBeenLastCalledWith('DashboardStack', {
      screen: 'TermsAndConditions',
    });
    tree.unmount();
  });

  it('highlights the screen on top of the nested stack', () => {
    useUserStore.setState({ user: USER });
    const tree = renderDrawer({
      index: 1,
      routes: [
        { key: 'd', name: 'Dashboard' },
        { key: 'a', name: 'AboutUs' },
      ],
    });
    const about = hostWithLabel(tree.root, 'About');
    expect(about.some(n => n.props.accessibilityState.selected === true)).toBe(true);
    const contact = hostWithLabel(tree.root, 'Contact us');
    expect(contact.every(n => !n.props.accessibilityState.selected)).toBe(true);

    // Re-selecting the current screen only closes the drawer.
    press(tree.root, 'About');
    expect(nav.closeDrawer).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
    tree.unmount();
  });

  it('Appearance radios set the theme preference', () => {
    useUserStore.setState({ user: USER });
    const tree = renderDrawer();
    const radios = tree.root.findAll(
      n =>
        typeof n.type === 'string' &&
        n.props.accessibilityRole === 'radio' &&
        n.props.accessibilityState,
    );
    expect(radios.map(r => r.props.accessibilityLabel)).toEqual(['System', 'Light', 'Dark']);
    expect(radios.map(r => r.props.accessibilityState.selected)).toEqual([false, false, true]);
    expect(
      tree.root.findAll(n => n.props.accessibilityRole === 'radiogroup')[0].props
        .accessibilityLabel,
    ).toBe('Appearance');

    press(tree.root, 'Light');
    expect(useThemeStore.getState().preference).toBe('light');
    press(tree.root, 'System');
    expect(useThemeStore.getState().preference).toBe('system');
    tree.unmount();
  });

  it('ends with Sign out and the version label; no privacy row without a URL', () => {
    useUserStore.setState({ user: USER });
    const tree = renderDrawer();
    expect(tappable(tree.root, 'Sign out')).toBeTruthy();
    expect(allText(tree.root)).toContain(APP_VERSION_LABEL);
    expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Privacy policy')).toHaveLength(0);
    tree.unmount();
  });
});

/* ───────────────────────── login ───────────────────────── */

describe('Login', () => {
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderLogin = () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<Login />);
    });
    return tree;
  };

  const submit = async (root: ReactTestInstance) => {
    renderer.act(() => {
      root.find(n => n.props.testID === 'login-submit' && typeof n.props.onPress === 'function').props.onPress();
    });
    await flush();
    await flush();
  };

  it('fields carry autofill + return-key semantics', () => {
    const tree = renderLogin();
    const email = input(tree.root, 'login-email').props;
    expect(email).toMatchObject({
      textContentType: 'username',
      autoComplete: 'email',
      returnKeyType: 'next',
      accessibilityLabel: 'Email',
    });
    const password = input(tree.root, 'login-password').props;
    expect(password).toMatchObject({
      textContentType: 'password',
      autoComplete: 'current-password',
      returnKeyType: 'go',
      accessibilityLabel: 'Password',
      secureTextEntry: true,
    });
    tree.unmount();
  });

  it("the CTA reads 'Sign in' in dark ink on the brand fill", () => {
    const tree = renderLogin();
    const label = tree.root
      .findAllByType(Text)
      .find(t => t.props.children === 'Sign in')!;
    const flat = Object.assign({}, ...[label.props.style].flat(Infinity).filter(Boolean));
    expect(flat.color).toBe(DARK_SCHEME.textOnBrand);
    tree.unmount();
  });

  it('a rejected sign-in shows the inline banner, error haptic, no Alert', async () => {
    networking.cognitoSignIn.mockRejectedValue(
      new AuthError({ name: 'NotAuthorizedException', message: 'Incorrect username or password.' }),
    );
    const tree = renderLogin();
    type(tree.root, 'login-email', ' Ada@Example.com ');
    type(tree.root, 'login-password', 'wrong-password');
    await submit(tree.root);

    expect(networking.cognitoSignIn).toHaveBeenCalledWith('ada@example.com', 'wrong-password');
    const banner = tree.root.find(n => n.props.testID === 'login-auth-error' && n.props.accessibilityLiveRegion);
    expect(banner.props.accessibilityLabel).toBe('Incorrect email or password.');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(haptics.error).toHaveBeenCalled();
    expect(haptics.success).not.toHaveBeenCalled();

    // Editing dismisses the stale banner.
    type(tree.root, 'login-password', 'wrong-password2');
    expect(tree.root.findAll(n => n.props.testID === 'login-auth-error')).toHaveLength(0);
    tree.unmount();
  });

  it('a successful sign-in stores the user (auth_time) and resets to the Drawer', async () => {
    const authTime = 1_790_000_000;
    networking.cognitoSignIn.mockResolvedValue({ isSignedIn: true, step: 'DONE' });
    networking.cognitoGetTokens.mockResolvedValue({
      idToken: jwt({ sub: 's', email: 'ada@example.com', auth_time: authTime, exp: 2e9, iat: authTime }),
    });
    const tree = renderLogin();
    type(tree.root, 'login-email', 'ada@example.com');
    type(tree.root, 'login-password', 'Correct-horse1');
    await submit(tree.root);

    expect(useUserStore.getState().user?.login_date?.getTime()).toBe(authTime * 1000);
    expect(haptics.success).toHaveBeenCalled();
    expect(haptics.error).not.toHaveBeenCalled();
    expect(mockNav.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({ routes: [{ name: 'Drawer' }] }),
      }),
    );
    tree.unmount();
  });

  it('return on the email field moves focus to the password field', async () => {
    const tree = renderLogin();
    const pw = input(tree.root, 'login-password').instance as { focus: Mock<AnyFn> };
    pw.focus.mockClear();
    renderer.act(() => {
      input(tree.root, 'login-email').props.onSubmitEditing();
    });
    // react-hook-form's setFocus defers the focus() call by one tick.
    await flush();
    expect(pw.focus).toHaveBeenCalled();
    tree.unmount();
  });

  it('new-password step: live checklist, confirm must match, different account', async () => {
    networking.cognitoSignIn.mockResolvedValue({
      isSignedIn: false,
      step: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
    });
    const tree = renderLogin();
    type(tree.root, 'login-email', 'ada@example.com');
    type(tree.root, 'login-password', 'Temp-pass1');
    await submit(tree.root);

    expect(allText(tree.root)).toContain('Set password');
    const newPw = input(tree.root, 'login-new-password').props;
    expect(newPw).toMatchObject({
      textContentType: 'newPassword',
      autoComplete: 'new-password',
      returnKeyType: 'next',
    });
    expect(input(tree.root, 'login-confirm-password').props.returnKeyType).toBe('go');

    const ruleLabels = () =>
      tree.root
        .findAll(n => typeof n.props.accessibilityLabel === 'string' && /, (met|not met)$/.test(n.props.accessibilityLabel) && typeof n.type === 'string')
        .map(n => n.props.accessibilityLabel as string);
    expect(ruleLabels()).toEqual([
      'At least 8 characters, not met',
      'Uppercase letter, not met',
      'Lowercase letter, not met',
      'Number, not met',
    ]);
    type(tree.root, 'login-new-password', 'Abcdefg1');
    expect(ruleLabels()).toEqual([
      'At least 8 characters, met',
      'Uppercase letter, met',
      'Lowercase letter, met',
      'Number, met',
    ]);

    type(tree.root, 'login-confirm-password', 'Abcdefg2');
    await submit(tree.root);
    expect(allText(tree.root)).toContain("Passwords don't match");
    expect(networking.cognitoConfirmNewPassword).not.toHaveBeenCalled();

    renderer.act(() => {
      tappable(tree.root, 'Use a different account').props.onPress();
    });
    await flush();
    expect(networking.cognitoSignOut).toHaveBeenCalledTimes(1);
    expect(allText(tree.root)).toContain('Sign in');
    expect(input(tree.root, 'login-email').props.value).toBe('ada@example.com');
    expect(input(tree.root, 'login-password').props.value).toBe('');
    tree.unmount();
  });

  it("'Terms of Use' is a link that pushes the Terms screen", () => {
    const tree = renderLogin();
    const link = tappable(tree.root, 'Terms of Use');
    renderer.act(() => link.props.onPress());
    expect(mockNav.navigate).toHaveBeenCalledWith('TermsAndConditions');
    expect(
      tree.root.findAll(n => n.props.accessibilityLabel === 'Terms of Use' && n.props.accessibilityRole === 'link').length,
    ).toBeGreaterThan(0);
    tree.unmount();
  });
});
