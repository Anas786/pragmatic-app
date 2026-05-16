export interface IUser {
  user_id: string | number;
  name: string;
  email: string;
  phone?: string;
  company_id?: string | number;
  company?: string;
  login_date: Date;
  image?: string;

  // Cognito-specific
  client_id?: string;
  customer_id?: string;
  is_client_admin?: boolean;
  is_customer_admin?: boolean;
}
