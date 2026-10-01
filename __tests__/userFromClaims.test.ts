/**
 * userFromClaims — the ONE IUser builder for the fresh-sign-in path
 * (useLogin) and the cold-start restore (useAuth / splash).
 *
 * `login_date` is the ID token's `auth_time` (the real sign-in instant),
 * never "when this object was built": a session restored hours later must
 * still report the original sign-in, and a token without the claim must
 * hide the Profile "Signed in" row rather than invent a time.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { CognitoIdTokenClaims } from '../src/utils/jwt';
import {
  presentText,
  profileSubtitle,
  signInInstantFromClaims,
  userFromClaims,
} from '../src/utils/user';

const AUTH_TIME_S = 1_790_000_000; // 2026-09-21T…Z

const claims = (extra: Partial<CognitoIdTokenClaims> = {}): CognitoIdTokenClaims => ({
  sub: 'sub-1',
  email: 'ada@example.com',
  exp: AUTH_TIME_S + 3600,
  iat: AUTH_TIME_S,
  'custom:userName': 'Ada Lovelace',
  ...extra,
});

afterEach(() => {
  jest.useRealTimers();
});

describe('userFromClaims → login_date', () => {
  it('is the auth_time instant', () => {
    const user = userFromClaims(claims({ auth_time: AUTH_TIME_S }));
    expect(user.login_date).toBeInstanceOf(Date);
    expect(user.login_date?.getTime()).toBe(AUTH_TIME_S * 1000);
  });

  it('is undefined when the token has no auth_time', () => {
    expect(userFromClaims(claims()).login_date).toBeUndefined();
  });

  it('does not change when the session is restored later', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date((AUTH_TIME_S + 60) * 1000));
    const atSignIn = userFromClaims(claims({ auth_time: AUTH_TIME_S }));

    // A refreshed ID token: new iat/exp, same auth_time — hours later.
    jest.setSystemTime(new Date((AUTH_TIME_S + 6 * 3600) * 1000));
    const restored = userFromClaims(
      claims({
        auth_time: AUTH_TIME_S,
        iat: AUTH_TIME_S + 6 * 3600,
        exp: AUTH_TIME_S + 7 * 3600,
      }),
    );

    expect(restored.login_date?.getTime()).toBe(atSignIn.login_date?.getTime());
    expect(restored.login_date?.getTime()).toBe(AUTH_TIME_S * 1000);
  });

  it('never falls back to the current time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T10:00:00Z'));
    const user = userFromClaims(claims());
    expect(user.login_date).toBeUndefined();
  });
});

describe('signInInstantFromClaims', () => {
  it.each([
    [undefined, undefined],
    [null, undefined],
    [0, undefined],
    [-5, undefined],
    [Number.NaN, undefined],
    [Number.POSITIVE_INFINITY, undefined],
    ['', undefined],
    ['  ', undefined],
    ['abc', undefined],
    [{}, undefined],
  ])('rejects %p', (input, expected) => {
    expect(signInInstantFromClaims(input)).toBe(expected);
  });

  it('accepts a numeric string (defensive — some issuers stringify)', () => {
    expect(signInInstantFromClaims(String(AUTH_TIME_S))?.getTime()).toBe(
      AUTH_TIME_S * 1000,
    );
  });
});

describe('userFromClaims → identity fields', () => {
  it('maps the custom claims', () => {
    const user = userFromClaims(
      claims({
        'custom:userId': 'u-42',
        'custom:company': 'Analytical Engines',
        'custom:phone': '+44 20 0000 0000',
        'custom:isClientAdmin': 'True',
        'custom:isCustomerAdmin': 'False',
      }),
    );
    expect(user).toMatchObject({
      user_id: 'u-42',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      phone: '+44 20 0000 0000',
      is_client_admin: true,
      is_customer_admin: false,
    });
  });

  it('falls back to cognito:username, then email, for the name', () => {
    expect(
      userFromClaims(
        claims({ 'custom:userName': undefined, 'cognito:username': 'ada' }),
      ).name,
    ).toBe('ada');
    expect(userFromClaims(claims({ 'custom:userName': undefined })).name).toBe(
      'ada@example.com',
    );
  });

  it('is pure — the same claims give equal users', () => {
    const c = claims({ auth_time: AUTH_TIME_S });
    expect(userFromClaims(c)).toEqual(userFromClaims(c));
  });
});

describe('profileSubtitle', () => {
  it('prefers the company', () => {
    expect(
      profileSubtitle({
        company: 'Analytical Engines',
        is_client_admin: true,
        email: 'ada@example.com',
      }),
    ).toBe('Analytical Engines');
  });

  it("says 'Client admin' for a client admin without a company", () => {
    expect(
      profileSubtitle({ company: '  ', is_client_admin: true, email: 'ada@example.com' }),
    ).toBe('Client admin');
  });

  it('falls back to the email', () => {
    expect(
      profileSubtitle({ company: undefined, is_client_admin: false, email: 'ada@example.com' }),
    ).toBe('ada@example.com');
  });

  it('is undefined (never a placeholder word) when nothing is known', () => {
    expect(profileSubtitle({ company: undefined, email: '' })).toBeUndefined();
  });
});

describe('presentText', () => {
  it('trims and drops empty / non-string values', () => {
    expect(presentText('  Ada ')).toBe('Ada');
    expect(presentText('')).toBeUndefined();
    expect(presentText('   ')).toBeUndefined();
    expect(presentText(undefined)).toBeUndefined();
    expect(presentText(42)).toBeUndefined();
  });
});
