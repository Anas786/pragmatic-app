import React, { FC, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { AppText, AppTextInput, PressableScale } from 'src/components/common';
import {
  EmailPlainIcon,
  EyeIcon,
  EyeOffIcon,
  PasswordIcon,
} from 'src/assets/icons';
import {
  FONT_SIZE_MD,
  FONT_SIZE_XS,
  ICON_SIZE_MD,
  WHITE,
} from 'src/utils';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import { useLogin } from 'src/hooks';

const LoginForm: FC = () => {
  const {
    control,
    onSubmit,
    loading,
    requiresNewPassword,
    newPasswordControl,
    onSubmitNewPassword,
    newPasswordErrors,
  } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);

  return (
    <View style={styles.formContainer}>
      {!requiresNewPassword ? (
        <>
          <View style={styles.inputsContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={themed.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <EmailPlainIcon size={ICON_SIZE_MD} />
                  </View>
                  <AppTextInput
                    style={styles.input}
                    placeholder="Email or Phone"
                    placeholderTextColor={scheme.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={themed.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <PasswordIcon size={ICON_SIZE_MD} />
                  </View>
                  <AppTextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={scheme.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <PressableScale
                    onPress={() => setShowPassword(prev => !prev)}
                    hitSlop={10}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    style={styles.iconContainer}>
                    {showPassword ? (
                      <EyeOffIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
                    ) : (
                      <EyeIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
                    )}
                  </PressableScale>
                </View>
              )}
            />
          </View>

          <PressableScale
            style={themed.loginButton}
            onPress={onSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <AppText color={WHITE} fontSize={FONT_SIZE_MD} semi_bold>
                Login
              </AppText>
            )}
          </PressableScale>
        </>
      ) : (
        <>
          <AppText
            color={scheme.textPrimary}
            fontSize={FONT_SIZE_XS}
            center
            style={styles.newPasswordHint}>
            Your account requires a new password. Please set one to continue.
          </AppText>
          <View style={styles.inputsContainer}>
            <Controller
              control={newPasswordControl}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={themed.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <PasswordIcon size={ICON_SIZE_MD} />
                  </View>
                  <AppTextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={scheme.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <PressableScale
                    onPress={() => setShowNewPassword(prev => !prev)}
                    hitSlop={10}
                    accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                    style={styles.iconContainer}>
                    {showNewPassword ? (
                      <EyeOffIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
                    ) : (
                      <EyeIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
                    )}
                  </PressableScale>
                </View>
              )}
            />
            {newPasswordErrors.newPassword?.message ? (
              <AppText color={scheme.brand} fontSize={FONT_SIZE_XS}>
                {newPasswordErrors.newPassword.message}
              </AppText>
            ) : null}
          </View>

          <PressableScale
            style={themed.loginButton}
            onPress={onSubmitNewPassword}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <AppText color={WHITE} fontSize={FONT_SIZE_MD} semi_bold>
                Set password &amp; continue
              </AppText>
            )}
          </PressableScale>
        </>
      )}
    </View>
  );
};

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: scheme.surfaceMuted,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: 100,
      height: 44,
      paddingHorizontal: 12,
      gap: 8,
    },
    loginButton: {
      backgroundColor: scheme.brand,
      height: 48,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
  });

const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
    maxWidth: 337,
    gap: 20,
  },
  inputsContainer: {
    gap: 16,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
  },
  newPasswordHint: {
    maxWidth: 309,
    lineHeight: 14,
    paddingHorizontal: 10,
  },
});

export default LoginForm;
