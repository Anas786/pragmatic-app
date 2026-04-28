export interface ILogin {
  email: string;
  password: string;
}

export interface INewPassword {
  newPassword: string;
}

export type AuthChallenge =
  | 'NONE'
  | 'NEW_PASSWORD_REQUIRED'
  | 'SMS_MFA'
  | 'TOTP_MFA';
