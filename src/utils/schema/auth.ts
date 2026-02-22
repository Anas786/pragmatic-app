import * as yup from 'yup';

export const LoginSchema = yup.object().shape({
  password: yup.string().required('Password is required'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter correct email'),
});
