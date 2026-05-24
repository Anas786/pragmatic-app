import React, { FC, useState } from 'react';
import { Controller } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  AppText,
  AppTextInput,
  BaseKeyboardAvoid,
  PressableScale,
  ScreenContainer,
  ScrollContainer,
} from 'src/components/common';
import { useLogin } from 'src/hooks';
import { Scheme, radius, space, useScheme, useThemedStyles } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_XL,
  FONT_SIZE_XS,
  ICON_SIZE_MD,
  WHITE,
  normalizeHeight,
  normalizeWidth,
} from 'src/utils';
import { Logo } from 'src/assets';
import {
  EmailPlainIcon,
  EyeIcon,
  EyeOffIcon,
  PasswordIcon,
} from 'src/assets/icons';

const EmailIcon: FC = () => (
  <View style={styles.iconContainer}>
    <EmailPlainIcon size={ICON_SIZE_MD} />
  </View>
);

const LockIcon: FC = () => (
  <View style={styles.iconContainer}>
    <PasswordIcon size={ICON_SIZE_MD} />
  </View>
);

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  color: string;
}

const PasswordVisibilityToggle: FC<PasswordVisibilityToggleProps> = ({
  visible,
  onToggle,
  color,
}) => (
  <PressableScale
    onPress={onToggle}
    hitSlop={10}
    accessibilityLabel={visible ? 'Hide password' : 'Show password'}
    style={styles.iconContainer}
    scaleTo={0.9}>
    {visible ? (
      <EyeOffIcon size={ICON_SIZE_MD} color={color} />
    ) : (
      <EyeIcon size={ICON_SIZE_MD} color={color} />
    )}
  </PressableScale>
);

const Login: FC = () => {
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
  const themed = useThemedStyles(createStyles);

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <BaseKeyboardAvoid
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollContainer
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none">
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Image source={Logo} style={styles.logo} resizeMode="contain" />
                <AppText
                  color={scheme.textPrimary}
                  fontSize={FONT_SIZE_XL}
                  medium>
                  Welcome
                </AppText>
              </View>
              <AppText
                color={scheme.textSecondary}
                fontSize={FONT_SIZE_XS}
                center
                style={styles.subtitle}>
                Please enter your email/phone or connect to your accounts to
                continue.
              </AppText>
            </View>

            <View style={styles.formContainer}>
              {!requiresNewPassword ? (
                <>
                  <View style={styles.inputsContainer}>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={themed.inputWrapper}>
                          <EmailIcon />
                          <AppTextInput
                            style={styles.input}
                            placeholder="Email or Phone"
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
                          <LockIcon />
                          <AppTextInput
                            style={styles.input}
                            placeholder="Password"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                          />
                          <PasswordVisibilityToggle
                            visible={showPassword}
                            onToggle={() => setShowPassword(prev => !prev)}
                            color={scheme.textSecondary}
                          />
                        </View>
                      )}
                    />
                  </View>

                  <PressableScale
                    onPress={onSubmit}
                    disabled={loading}
                    style={themed.loginButton}
                    haptic="success">
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
                    style={styles.subtitle}>
                    Your account requires a new password. Please set one to
                    continue.
                  </AppText>
                  <View style={styles.inputsContainer}>
                    <Controller
                      control={newPasswordControl}
                      name="newPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View style={themed.inputWrapper}>
                          <LockIcon />
                          <AppTextInput
                            style={styles.input}
                            placeholder="New password"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!showNewPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                          />
                          <PasswordVisibilityToggle
                            visible={showNewPassword}
                            onToggle={() => setShowNewPassword(prev => !prev)}
                            color={scheme.textSecondary}
                          />
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
                    onPress={onSubmitNewPassword}
                    disabled={loading}
                    style={themed.loginButton}
                    haptic="success">
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
          </View>

          <View style={styles.footer}>
            <AppText
              color={scheme.textPrimary}
              fontSize={FONT_SIZE_XS}
              center
              style={styles.footerText}>
              By clicking Continue, you agree to Dart{' '}
              <AppText color={scheme.brand} fontSize={FONT_SIZE_XS} semi_bold>
                Terms of Use
              </AppText>{' '}
              and{' '}
              <AppText color={scheme.brand} fontSize={FONT_SIZE_XS} semi_bold>
                Privacy Policy
              </AppText>
              .
            </AppText>
          </View>
        </ScrollContainer>
      </BaseKeyboardAvoid>
    </ScreenContainer>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: scheme.surfaceMuted,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: radius.pill,
      height: normalizeHeight(44),
      paddingHorizontal: space.md,
      gap: space.sm,
    },
    loginButton: {
      backgroundColor: scheme.brand,
      height: normalizeHeight(48),
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.xl,
    },
  });

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalizeWidth(28),
    paddingTop: normalizeHeight(40),
  },
  headerContainer: {
    alignItems: 'center',
    gap: space.sm,
    marginBottom: normalizeHeight(28),
  },
  logoContainer: {
    alignItems: 'center',
    gap: normalizeHeight(28),
  },
  logo: {
    width: normalizeWidth(85),
    height: normalizeHeight(58),
  },
  subtitle: {
    maxWidth: normalizeWidth(309),
    lineHeight: normalizeHeight(14),
    paddingHorizontal: space.sm,
  },
  formContainer: {
    width: '100%',
    maxWidth: normalizeWidth(337),
    gap: space.xl,
  },
  inputsContainer: {
    gap: space.lg,
  },
  iconContainer: {
    width: normalizeWidth(20),
    height: normalizeHeight(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    paddingTop: space.sm,
  },
  footerText: {
    lineHeight: normalizeHeight(20),
  },
});

export default Login;
