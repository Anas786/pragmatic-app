import * as yup from 'yup';
import { INewPassword } from 'src/types';

export const LoginSchema = yup.object().shape({
  password: yup.string().required('Enter your password'),
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
    .required('Enter your email address')
    .email('Enter a valid email address'),
});

/**
 * The new-password policy, in the order the Login checklist shows it.
 * NewPasswordSchema below is built from these SAME tests, so the live
 * checklist and the submit-time validation can never disagree.
 */
export interface PasswordRule {
  key: 'length' | 'upper' | 'lower' | 'number';
  /** Short visible checklist text. */
  label: string;
  /** Screen-reader name ('Uppercase letter, met'). */
  spoken: string;
  /** Inline error when the rule fails at submit. */
  error: string;
  test: (value: string) => boolean;
}

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    key: 'length',
    label: `${PASSWORD_MIN_LENGTH}+ characters`,
    spoken: `At least ${PASSWORD_MIN_LENGTH} characters`,
    error: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
    test: v => v.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: 'upper',
    label: 'Uppercase',
    spoken: 'Uppercase letter',
    error: 'Add an uppercase letter',
    test: v => /[A-Z]/.test(v),
  },
  {
    key: 'lower',
    label: 'Lowercase',
    spoken: 'Lowercase letter',
    error: 'Add a lowercase letter',
    test: v => /[a-z]/.test(v),
  },
  {
    key: 'number',
    label: 'Number',
    spoken: 'Number',
    error: 'Add a number',
    test: v => /[0-9]/.test(v),
  },
];

/** Each rule with whether `value` meets it (checklist view-model). */
export const passwordRuleStatus = (
  value: string | null | undefined,
): Array<PasswordRule & { met: boolean }> => {
  const v = value ?? '';
  return PASSWORD_RULES.map(rule => ({ ...rule, met: rule.test(v) }));
};

/** Form values of the NEW_PASSWORD_REQUIRED step (confirm is UI-only). */
export type NewPasswordFormValues = INewPassword & { confirmPassword: string };

export const NewPasswordSchema = yup.object().shape({
  newPassword: PASSWORD_RULES.reduce(
    (schema, rule) => schema.test(rule.key, rule.error, v => rule.test(v ?? '')),
    yup.string().required('Enter a new password'),
  ),
  confirmPassword: yup
    .string()
    .required('Re-enter your new password')
    .oneOf([yup.ref('newPassword')], "Passwords don't match"),
});
