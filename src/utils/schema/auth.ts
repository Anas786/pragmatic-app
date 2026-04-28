import * as yup from 'yup';

export const LoginSchema = yup.object().shape({
  password: yup.string().required('Password is required'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter correct email'),
});

export const NewPasswordSchema = yup.object().shape({
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[a-z]/, 'Must contain a lowercase letter')
    .matches(/[0-9]/, 'Must contain a number'),
});
