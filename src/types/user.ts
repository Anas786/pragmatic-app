export interface IUser {
  user_id: string | number;
  name: string;
  email: string;
  phone?: string;
  company_id?: string | number;
  company?: string;
  /**
   * When the user actually signed in — the ID token's `auth_time`, NOT the
   * moment this record was built (a cold-start session restore must not
   * look like a fresh sign-in). Undefined when the claim is absent; the
   * Profile screen then hides its "Signed in" row.
   */
  login_date?: Date;
  image?: string;

  // Cognito-specific
  client_id?: string;
  customer_id?: string;
  is_client_admin?: boolean;
  is_customer_admin?: boolean;
}
