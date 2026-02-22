export interface IUser {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  company_id: number;
  company: string;
  login_date: Date;
  image?: string;
}
