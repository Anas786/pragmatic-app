import * as yup from 'yup';

export const LoginSchema = yup.object().shape({
  password: yup.string().required('Password is required'),
  email: yup
    .string()
    // Transforms (non-strict mode) run BEFORE .email(), so a trailing space
    // appended by keyboard autocomplete can't fail validation. yupResolver
    // applies transforms, so the submitted value is normalized too.
    //
    // .lowercase() matters beyond cosmetics: the API treats the address
    // case-sensitively, so `User@x.com` and `user@x.com` are different
    // identities server-side. The input sets autoCapitalize="none", but that
    // doesn't cover paste, password-manager autofill, or a hardware keyboard.
    .trim()
    .lowercase()
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
