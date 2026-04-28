/**
 * Minimal JWT helpers — decode payload without verification.
 * We only use this for reading Cognito idToken claims on-device. Cognito
 * already validates tokens server-side at API Gateway via the authorizer.
 */

export interface CognitoIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  aud?: string;
  iss?: string;
  exp: number;
  iat: number;
  token_use?: 'id' | 'access';

  // Custom Pragmatic claims
  'custom:clientId'?: string;
  'custom:userName'?: string;
  'custom:isClientAdmin'?: string; // "True" | "False"
  'custom:isCustomerAdmin'?: string;
  'custom:customerId'?: string;
  'custom:userId'?: string;
  'custom:companyId'?: string;
  'custom:company'?: string;
  'custom:phone'?: string;
}

const base64UrlDecode = (input: string): string => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const normalized = pad ? padded + '='.repeat(4 - pad) : padded;

  if (typeof globalThis.atob === 'function') {
    return decodeURIComponent(
      globalThis
        .atob(normalized)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  }

  // Fallback — should not hit in RN runtime but keeps things safe for tests.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

export const decodeJwt = <T = CognitoIdTokenClaims>(token: string): T | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as T;
  } catch {
    return null;
  }
};

export const parseBool = (value?: string): boolean =>
  typeof value === 'string' && value.toLowerCase() === 'true';

export const isTokenExpired = (token: string, skewSeconds = 30): boolean => {
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return Date.now() >= (claims.exp - skewSeconds) * 1000;
};
