/**
 * Test helper (not a suite — __tests__/fixtures/ is outside testMatch):
 * seeds the AsyncStorage jest mock with a Cognito session laid out exactly
 * the way @aws-amplify/auth 6.x's TokenStore.storeTokens writes it, for the
 * client id the app configures.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { amplifyConfig } from '../../src/config/amplify';

const storage = AsyncStorage as unknown as {
  __INTERNAL_MOCK_STORAGE__: Record<string, string>;
};

export const USER = 'f1e2d3c4-0000-4000-8000-000000000001';
/** A second account, for sign-out → sign-in-as-someone-else scenarios. */
export const OTHER_USER = 'b0b0b0b0-0000-4000-8000-00000000000b';
// Amplify's native DefaultStorage prefixes every key with `@MemoryStorage:`.
const PREFIX = `@MemoryStorage:CognitoIdentityServiceProvider.${amplifyConfig.Auth.Cognito.userPoolClientId}.`;

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/, '');
export const jwt = (payload: object) =>
  `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.signature`;

export const nowS = () => Math.floor(Date.now() / 1000);

export const resetStorage = () => {
  storage.__INTERNAL_MOCK_STORAGE__ = {};
};

/** Seeds a stored session; returns the stored access- and ID-token strings. */
export const seedSession = ({
  accessExpired,
  clockDriftMs = 0,
  tag = 'a',
  refresh = true,
  user = USER,
  revocable = false,
}: {
  accessExpired: boolean;
  /** Amplify's stored clockDrift (server minus device time, ms), verbatim. */
  clockDriftMs?: number | string;
  /** Distinguishes the tokens of one seeded session from another's. */
  tag?: string;
  /** Store a refresh token (default true — USER_SRP_AUTH always gets one). */
  refresh?: boolean;
  /** Whose session (Amplify's LastAuthUser); default USER. */
  user?: string;
  /**
   * Give the access token an `origin_jti` claim, as Cognito does when token
   * revocation is on: Amplify's signOut() then revokes the stored refresh
   * token (RevokeToken) before wiping the store.
   */
  revocable?: boolean;
}): { accessToken: string; idToken: string } => {
  const exp = accessExpired ? nowS() - 3600 : nowS() + 3600;
  const accessToken = jwt({
    sub: user,
    exp,
    iat: exp - 86400,
    token_use: 'access',
    tag,
    ...(revocable ? { origin_jti: `jti-${tag}` } : {}),
  });
  const idToken = jwt({
    sub: user,
    email: 'ada@example.com',
    'custom:userName': 'Ada Lovelace',
    token_use: 'id',
    exp,
    iat: exp - 86400,
    tag,
  });
  const s = storage.__INTERNAL_MOCK_STORAGE__;
  s[`${PREFIX}LastAuthUser`] = user;
  s[`${PREFIX}${user}.accessToken`] = accessToken;
  s[`${PREFIX}${user}.idToken`] = idToken;
  if (refresh) {
    s[`${PREFIX}${user}.refreshToken`] = `opaque-refresh-token-${tag}`;
  }
  s[`${PREFIX}${user}.clockDrift`] = `${clockDriftMs}`;
  return { accessToken, idToken };
};

/** The stored access token of `user` (null when none). */
export const storedAccessToken = (user: string = USER): string | null =>
  storage.__INTERNAL_MOCK_STORAGE__[`${PREFIX}${user}.accessToken`] ?? null;

/**
 * A successful GetTokensFromRefreshToken response, as Amplify's fetch
 * handler reads it, with fresh tokens of `user` (tagged `tag`).
 * `rotatedRefreshToken`: Cognito's refresh-token rotation also returns a new
 * refresh token, which Amplify stores in place of the old one.
 * `revocable`: see seedSession.
 */
export const cognitoRefreshed = (
  user: string,
  tag: string,
  {
    rotatedRefreshToken,
    revocable = false,
  }: { rotatedRefreshToken?: string; revocable?: boolean } = {},
) => {
  const iat = nowS();
  const accessToken = jwt({
    sub: user,
    exp: iat + 3600,
    iat,
    token_use: 'access',
    tag,
    ...(revocable ? { origin_jti: `jti-${tag}` } : {}),
  });
  const idToken = jwt({ sub: user, exp: iat + 3600, iat, token_use: 'id', tag });
  const body = {
    AuthenticationResult: {
      AccessToken: accessToken,
      IdToken: idToken,
      ExpiresIn: 3600,
      TokenType: 'Bearer',
      ...(rotatedRefreshToken ? { RefreshToken: rotatedRefreshToken } : {}),
    },
  };
  return {
    accessToken,
    response: {
      status: 200,
      headers: { forEach: () => undefined },
      body: null,
      json: async () => body,
      text: async () => JSON.stringify(body),
      blob: async () => undefined,
    },
  };
};

/** A successful Cognito JSON-protocol response (e.g. RevokeToken's `{}`). */
export const cognitoOk = (body: object = {}) => ({
  status: 200,
  headers: { forEach: () => undefined },
  body: null,
  json: async () => body,
  text: async () => JSON.stringify(body),
  blob: async () => undefined,
});

/** A Cognito JSON-protocol error response, as Amplify's fetch handler reads it. */
export const cognitoError = (name: string, status = 400) => ({
  status,
  headers: {
    forEach: (cb: (value: string, key: string) => void) =>
      cb(name, 'x-amzn-errortype'),
  },
  body: null,
  json: async () => ({ __type: name, message: `${name} (test)` }),
  text: async () => JSON.stringify({ __type: name }),
  blob: async () => undefined,
});

/** The stored Cognito user-pool keys, sorted. */
export const cognitoKeys = () =>
  Object.keys(storage.__INTERNAL_MOCK_STORAGE__)
    .filter(k => k.startsWith(PREFIX))
    .sort();

/** Drains promise chains (the AsyncStorage mock is microtask-based). */
export const flush = async () => {
  for (let i = 0; i < 400; i++) {
    await Promise.resolve();
  }
};
