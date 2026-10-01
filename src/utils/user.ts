import { IUser } from 'src/types';
import { CognitoIdTokenClaims, parseBool } from './jwt';

/**
 * The sign-in instant from the ID token's `auth_time` (epoch seconds), or
 * undefined when it is missing / not a positive finite number. Cognito
 * copies `auth_time` unchanged into every refreshed ID token, so the same
 * session always yields the same instant — a cold-start restore hours later
 * still shows when the user really signed in, not "now".
 */
export const signInInstantFromClaims = (authTime: unknown): Date | undefined => {
  const seconds =
    typeof authTime === 'number'
      ? authTime
      : typeof authTime === 'string' && authTime.trim() !== ''
      ? Number(authTime)
      : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
};

/**
 * Single source of truth for deriving an `IUser` from Cognito idToken claims.
 *
 * Used by BOTH the cold-start hydration path (useAuth) and the fresh-login
 * path (useLogin) so the user object's shape can't drift between the two —
 * a claim added in only one place would otherwise give cold-start vs
 * fresh-login users different shapes, and both copies would still typecheck.
 *
 * Pure: the same claims always produce the same user (no `new Date()`).
 */
export const userFromClaims = (claims: CognitoIdTokenClaims): IUser => ({
  user_id: claims['custom:userId'] || claims.sub,
  name:
    claims['custom:userName'] ||
    claims['cognito:username'] ||
    claims.email ||
    '',
  email: claims.email || '',
  phone: claims['custom:phone'],
  company_id: claims['custom:companyId'],
  company: claims['custom:company'],
  client_id: claims['custom:clientId'],
  customer_id: claims['custom:customerId'],
  is_client_admin: parseBool(claims['custom:isClientAdmin']),
  is_customer_admin: parseBool(claims['custom:isCustomerAdmin']),
  login_date: signInInstantFromClaims(claims.auth_time),
});

/** Trimmed text, or undefined when there is nothing to show. */
export const presentText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * The line under a person's name (Profile header): their company when the
 * token carries one, else 'Client admin' for client admins, else their
 * email. Undefined when none of those exist — the caller renders nothing,
 * never a placeholder word.
 */
export const profileSubtitle = (
  user: Pick<IUser, 'company' | 'is_client_admin' | 'email'>,
): string | undefined =>
  presentText(user.company) ??
  (user.is_client_admin ? 'Client admin' : undefined) ??
  presentText(user.email);
