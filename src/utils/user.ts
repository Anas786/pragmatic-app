import { IUser } from 'src/types';
import { CognitoIdTokenClaims, parseBool } from './jwt';

/**
 * Single source of truth for deriving an `IUser` from Cognito idToken claims.
 *
 * Used by BOTH the cold-start hydration path (useAuth) and the fresh-login
 * path (useLogin) so the user object's shape can't drift between the two —
 * a claim added in only one place would otherwise give cold-start vs
 * fresh-login users different shapes, and both copies would still typecheck.
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
  login_date: new Date(),
});
