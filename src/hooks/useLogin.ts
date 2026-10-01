import { yupResolver } from '@hookform/resolvers/yup';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  cognitoConfirmNewPassword,
  cognitoErrorMessage,
  cognitoGetTokens,
  cognitoSignIn,
  cognitoSignOut,
} from 'src/networking';
import { ILogin } from 'src/types';
import {
  decodeJwt,
  display,
  inspectError,
  LoginSchema,
  NewPasswordFormValues,
  NewPasswordSchema,
} from 'src/utils';
import { haptics } from 'src/utils/haptics';
import { userFromClaims } from 'src/utils/user';
import { useUserStore } from './useUserStore';

/** Inline sign-in failure shown in the Login banner (never a native Alert). */
export interface LoginAuthError {
  message: string;
}

/** A sign-in step this app has no UI for (MFA codes, sign-up confirm…). */
const unsupportedStepError = (step: string): LoginAuthError => ({
  message: __DEV__
    ? `This account needs a sign-in step the app doesn't support yet (${step}). Contact support.`
    : "This account needs a sign-in step the app doesn't support yet. Contact support.",
});

export const useLogin = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useUserStore();

  const loginForm = useForm<ILogin>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    resolver: yupResolver(LoginSchema),
  });

  const newPasswordForm = useForm<NewPasswordFormValues>({
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onSubmit',
    resolver: yupResolver(NewPasswordSchema),
  });

  const [loading, setLoading] = useState(false);
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  const [authError, setAuthError] = useState<LoginAuthError | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  /** Outcome feedback: the haptic follows the RESULT, never the tap. */
  const fail = useCallback((error: LoginAuthError) => {
    setAuthError(error);
    haptics.error();
  }, []);

  /**
   * Derive an `IUser` record from the Cognito idToken claims and persist it
   * to the user store. Then reset navigation to the authenticated stack.
   */
  const finalizeSignIn = async () => {
    const tokens = await cognitoGetTokens();
    if (!tokens?.idToken) {
      throw new Error('No session after sign-in.');
    }

    const claims = decodeJwt(tokens.idToken);
    if (!claims) throw new Error('Could not read session claims.');

    setUser(userFromClaims(claims));
    haptics.success();

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Drawer' }],
      }),
    );
  };

  const onSubmit = loginForm.handleSubmit(
    async ({ email, password }) => {
      setLoading(true);
      setAuthError(null);
      try {
        // Belt-and-braces with LoginSchema's .trim()/.lowercase() transforms:
        // the API matches the address case-sensitively, so this must never go
        // out un-normalized even if the resolver is bypassed or changed.
        const result = await cognitoSignIn(email.trim().toLowerCase(), password);

        if (result.isSignedIn) {
          await finalizeSignIn();
          return;
        }

        if (result.step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setRequiresNewPassword(true);
          return;
        }

        fail(unsupportedStepError(result.step));
      } catch (err) {
        display('useLogin.onSubmit ERROR', inspectError(err), undefined, true);
        fail({ message: cognitoErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    },
    () => haptics.error(),
  );

  const onSubmitNewPassword = newPasswordForm.handleSubmit(
    async ({ newPassword }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const result = await cognitoConfirmNewPassword(newPassword);
        if (result.isSignedIn) {
          setRequiresNewPassword(false);
          await finalizeSignIn();
          return;
        }
        fail(unsupportedStepError(result.step));
      } catch (err) {
        display(
          'useLogin.onSubmitNewPassword ERROR',
          inspectError(err),
          undefined,
          true,
        );
        fail({ message: cognitoErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    },
    () => haptics.error(),
  );

  /**
   * Leave the NEW_PASSWORD_REQUIRED step and go back to the sign-in form
   * (e.g. the wrong account was entered). Drops Amplify's pending challenge
   * / any stored session via the shared cognitoSignOut, which a following
   * cognitoSignIn waits for — so a fresh sign-in starts clean.
   */
  const switchAccount = async () => {
    setLoading(true);
    try {
      await cognitoSignOut(); // never rejects
    } finally {
      newPasswordForm.reset();
      loginForm.resetField('password');
      setAuthError(null);
      setRequiresNewPassword(false);
      setLoading(false);
    }
  };

  return {
    control: loginForm.control,
    errors: loginForm.formState.errors,
    onSubmit,
    loading,
    /** Return-key chaining: email → password. */
    focusPassword: () => loginForm.setFocus('password'),

    /** Inline banner content (null = no banner). */
    authError,
    clearAuthError,

    // New-password challenge
    requiresNewPassword,
    newPasswordControl: newPasswordForm.control,
    newPasswordErrors: newPasswordForm.formState.errors,
    onSubmitNewPassword,
    /** Return-key chaining: new password → confirm. */
    focusConfirmPassword: () => newPasswordForm.setFocus('confirmPassword'),
    switchAccount,
  };
};
