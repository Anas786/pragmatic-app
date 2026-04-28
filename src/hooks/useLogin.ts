import { yupResolver } from '@hookform/resolvers/yup';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import {
  cognitoConfirmNewPassword,
  cognitoErrorMessage,
  cognitoGetTokens,
  cognitoSignIn,
} from 'src/networking';
import { ILogin, INewPassword, IUser } from 'src/types';
import {
  decodeJwt,
  display,
  inspectError,
  LoginSchema,
  NewPasswordSchema,
  parseBool,
} from 'src/utils';
import { useUserStore } from './useUserStore';

export const useLogin = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useUserStore();

  const loginForm = useForm<ILogin>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    resolver: yupResolver(LoginSchema),
  });

  const newPasswordForm = useForm<INewPassword>({
    defaultValues: { newPassword: '' },
    mode: 'onSubmit',
    resolver: yupResolver(NewPasswordSchema),
  });

  const [loading, setLoading] = useState(false);
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);

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

    const user: IUser = {
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
    };

    setUser(user);

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Drawer' }],
      }),
    );
  };

  const onSubmit = loginForm.handleSubmit(async ({ email, password }) => {
    setLoading(true);
    try {
      const result = await cognitoSignIn(email.trim(), password);

      if (result.isSignedIn) {
        await finalizeSignIn();
        return;
      }

      if (result.step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setRequiresNewPassword(true);
        return;
      }

      Alert.alert(
        'Sign-in incomplete',
        `Additional step required: ${result.step}`,
      );
    } catch (err) {
      display('useLogin.onSubmit ERROR', inspectError(err), undefined, true);
      Alert.alert('Login Failed', cognitoErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  const onSubmitNewPassword = newPasswordForm.handleSubmit(
    async ({ newPassword }) => {
      setLoading(true);
      try {
        const result = await cognitoConfirmNewPassword(newPassword);
        if (result.isSignedIn) {
          setRequiresNewPassword(false);
          await finalizeSignIn();
          return;
        }
        Alert.alert(
          'Sign-in incomplete',
          `Additional step required: ${result.step}`,
        );
      } catch (err) {
        display(
          'useLogin.onSubmitNewPassword ERROR',
          inspectError(err),
          undefined,
          true,
        );
        Alert.alert('Password change failed', cognitoErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
  );

  return {
    control: loginForm.control,
    errors: loginForm.formState.errors,
    onSubmit,
    loading,

    // New-password challenge
    requiresNewPassword,
    newPasswordControl: newPasswordForm.control,
    newPasswordErrors: newPasswordForm.formState.errors,
    onSubmitNewPassword,
  };
};
