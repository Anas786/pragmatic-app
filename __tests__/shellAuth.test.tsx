/**
 * App-shell auth helpers:
 *  - LoginSchema / NewPasswordSchema copy + the confirm-password match,
 *  - PASSWORD_RULES / passwordRuleStatus (the live checklist) agreeing with
 *    the submit-time schema,
 *  - cognitoErrorMessage: plain-language copy, raw details only in dev,
 *  - openExternalUrl's catch-and-alert,
 *  - useLogout's double-tap guard (one dialog, one sign-out).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer from 'react-test-renderer';
import { Alert, AlertButton, Linking } from 'react-native';
import { AuthError } from 'aws-amplify/auth';
import {
  LoginSchema,
  NewPasswordSchema,
  PASSWORD_RULES,
  passwordRuleStatus,
} from '../src/utils/schema/auth';
import {
  cognitoErrorMessage,
  SIGN_IN_FALLBACK_MESSAGE,
} from '../src/networking/auth/cognito';
import { openExternalUrl, unableToOpenMessage } from '../src/utils/externalLinks';

const mockExecuteLogout = jest.fn<() => Promise<void>>();
jest.mock('../src/networking', () => ({
  executeLogout: () => mockExecuteLogout(),
}));

// Imported after the mock so useLogout picks up the stubbed executeLogout.
import { useLogout } from '../src/hooks/useLogout';

const validationErrors = async (
  schema: typeof NewPasswordSchema | typeof LoginSchema,
  value: object,
): Promise<string[]> => {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (err) {
    return (err as { errors: string[] }).errors;
  }
};

describe('LoginSchema', () => {
  it('uses the shared copy for a malformed email', async () => {
    expect(await validationErrors(LoginSchema, { email: 'ada@', password: 'x' })).toEqual([
      'Enter a valid email address',
    ]);
  });

  it('asks for both fields when empty', async () => {
    const errors = await validationErrors(LoginSchema, { email: '', password: '' });
    expect(errors).toEqual(
      expect.arrayContaining(['Enter your email address', 'Enter your password']),
    );
  });

  it('normalises the email (trim + lowercase) before validating', async () => {
    const out = await LoginSchema.validate({ email: '  Ada@Example.COM ', password: 'x' });
    expect(out.email).toBe('ada@example.com');
  });
});

describe('PASSWORD_RULES / passwordRuleStatus', () => {
  it('reports each rule per keystroke', () => {
    const met = (v: string) =>
      Object.fromEntries(passwordRuleStatus(v).map(r => [r.key, r.met]));
    expect(met('')).toEqual({ length: false, upper: false, lower: false, number: false });
    expect(met('a')).toEqual({ length: false, upper: false, lower: true, number: false });
    expect(met('aA')).toEqual({ length: false, upper: true, lower: true, number: false });
    expect(met('aA1')).toEqual({ length: false, upper: true, lower: true, number: true });
    expect(met('aA1aaaaa')).toEqual({ length: true, upper: true, lower: true, number: true });
  });

  it('treats null / undefined as empty', () => {
    expect(passwordRuleStatus(undefined).every(r => !r.met)).toBe(true);
    expect(passwordRuleStatus(null).every(r => !r.met)).toBe(true);
  });

  it('has spoken names for the checklist', () => {
    expect(PASSWORD_RULES.map(r => r.spoken)).toEqual([
      'At least 8 characters',
      'Uppercase letter',
      'Lowercase letter',
      'Number',
    ]);
  });
});

describe('NewPasswordSchema', () => {
  it('accepts a policy-compliant, matching pair', async () => {
    expect(
      await validationErrors(NewPasswordSchema, {
        newPassword: 'Abcdefg1',
        confirmPassword: 'Abcdefg1',
      }),
    ).toEqual([]);
  });

  it('blocks a mismatched confirmation', async () => {
    expect(
      await validationErrors(NewPasswordSchema, {
        newPassword: 'Abcdefg1',
        confirmPassword: 'Abcdefg2',
      }),
    ).toEqual(["Passwords don't match"]);
  });

  it('agrees with the checklist on every rule', async () => {
    const errors = await validationErrors(NewPasswordSchema, {
      newPassword: 'abc',
      confirmPassword: 'abc',
    });
    const failing = passwordRuleStatus('abc').filter(r => !r.met).map(r => r.error);
    expect(errors).toEqual(failing);
  });
});

describe('cognitoErrorMessage', () => {
  const authError = (name: string, message = 'raw cognito message') =>
    new AuthError({ name, message });

  it.each([
    ['NotAuthorizedException', 'Incorrect email or password.'],
    ['UserNotFoundException', 'No account found for this email.'],
    ['LimitExceededException', 'Too many attempts. Wait a few minutes, then try again.'],
    ['NetworkError', "You're offline. Check your internet connection, then try again."],
  ])('%s → friendly copy', (name, copy) => {
    expect(cognitoErrorMessage(authError(name))).toBe(copy);
  });

  it('recognises the lockout variant of NotAuthorizedException', () => {
    expect(
      cognitoErrorMessage(authError('NotAuthorizedException', 'Password attempts exceeded')),
    ).toBe('Too many attempts. Wait a few minutes, then try again.');
  });

  it('maps the new-password policy failure', () => {
    expect(cognitoErrorMessage(authError('InvalidPasswordException'))).toMatch(
      /doesn't meet the requirements/,
    );
  });

  describe('unknown failures', () => {
    const realDev = (global as { __DEV__?: boolean }).__DEV__;
    afterEach(() => {
      (global as { __DEV__?: boolean }).__DEV__ = realDev;
    });

    it('release builds never show the raw name / message', () => {
      (global as { __DEV__?: boolean }).__DEV__ = false;
      const msg = cognitoErrorMessage(new Error('socket hang up 0x7f'));
      expect(msg).toBe(SIGN_IN_FALLBACK_MESSAGE);
      expect(cognitoErrorMessage('boom')).toBe(SIGN_IN_FALLBACK_MESSAGE);
      expect(cognitoErrorMessage(undefined)).toBe(SIGN_IN_FALLBACK_MESSAGE);
    });

    it('dev builds append the raw detail after the friendly copy', () => {
      (global as { __DEV__?: boolean }).__DEV__ = true;
      const msg = cognitoErrorMessage(new Error('socket hang up'));
      expect(msg.startsWith(SIGN_IN_FALLBACK_MESSAGE)).toBe(true);
      expect(msg).toContain('socket hang up');
    });
  });
});

describe('openExternalUrl', () => {
  beforeEach(() => {
    // display() echoes the logged failure to the console in dev builds.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names the missing capability per scheme', () => {
    expect(unableToOpenMessage('tel:+92300')).toBe(
      'No app is available on this device to make calls.',
    );
    expect(unableToOpenMessage('mailto:a@b.c?subject=x')).toBe(
      'No app is available on this device to send email.',
    );
    expect(unableToOpenMessage('https://example.com')).toBe(
      'No app is available on this device to open this link.',
    );
  });

  it('alerts when no app can open the URL', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    openExternalUrl('mailto:info@example.com');
    await new Promise(r => setImmediate(r));
    expect(alert).toHaveBeenCalledWith(
      'Unable to open',
      'No app is available on this device to send email.',
    );
  });

  it('stays silent when the URL opens', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    openExternalUrl('https://example.com');
    await new Promise(r => setImmediate(r));
    expect(alert).not.toHaveBeenCalled();
  });
});

describe('useLogout', () => {
  type Hook = ReturnType<typeof useLogout>;
  let hook: Hook;
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  const Probe = ({ confirm }: { confirm?: boolean }) => {
    hook = useLogout({ confirm });
    return null;
  };

  const lastButtons = (): AlertButton[] =>
    (alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] ?? []) as AlertButton[];

  beforeEach(() => {
    mockExecuteLogout.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('a double tap opens ONE confirmation dialog', () => {
    renderer.act(() => {
      renderer.create(<Probe />);
    });
    renderer.act(() => {
      hook.logout();
      hook.logout();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Sign out');
  });

  it('confirming signs out once and ignores taps while in flight', async () => {
    let finish!: () => void;
    mockExecuteLogout.mockImplementation(
      () => new Promise<void>(resolve => (finish = resolve)),
    );
    renderer.act(() => {
      renderer.create(<Probe />);
    });
    renderer.act(() => hook.logout());
    renderer.act(() => {
      lastButtons()[1].onPress?.();
    });
    expect(mockExecuteLogout).toHaveBeenCalledTimes(1);
    expect(hook.loggingOut).toBe(true);

    renderer.act(() => hook.logout());
    expect(alertSpy).toHaveBeenCalledTimes(1);

    await renderer.act(async () => {
      finish();
    });
    expect(hook.loggingOut).toBe(false);
  });

  it('cancel closes the dialog so the next tap can open it again', () => {
    renderer.act(() => {
      renderer.create(<Probe />);
    });
    renderer.act(() => hook.logout());
    renderer.act(() => {
      lastButtons()[0].onPress?.();
    });
    renderer.act(() => hook.logout());
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockExecuteLogout).not.toHaveBeenCalled();
  });

  it('confirm:false signs out directly, still only once', () => {
    mockExecuteLogout.mockImplementation(() => new Promise<void>(() => {}));
    renderer.act(() => {
      renderer.create(<Probe confirm={false} />);
    });
    renderer.act(() => {
      hook.logout();
      hook.logout();
    });
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockExecuteLogout).toHaveBeenCalledTimes(1);
  });
});
