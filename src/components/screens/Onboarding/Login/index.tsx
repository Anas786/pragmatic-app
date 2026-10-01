import React, {
  FC,
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import {
  AccessibilityInfo,
  ActivityIndicator,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {
  AppText,
  AppTextInput,
  BaseKeyboardAvoid,
  IconButton,
  PESLogo,
  PressableScale,
  ScreenContainer,
  ScrollContainer,
} from 'src/components/common';
import { useLogin } from 'src/hooks/useLogin';
import {
  radius,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { IconProps, OnboardingStackParamList } from 'src/types';
import {
  COMPANY_NAME,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
} from 'src/utils/constants/company';
import { openExternalUrl } from 'src/utils/externalLinks';
import { NewPasswordFormValues, passwordRuleStatus } from 'src/utils/schema/auth';
import { ICON_SIZE_MD } from 'src/utils/theme';
import {
  EmailPlainIcon,
  EyeIcon,
  EyeOffIcon,
  PasswordIcon,
} from 'src/assets/icons';

/** Fixed (not normalised) so fields and the CTA are 52pt on every phone. */
const FIELD_HEIGHT = 52;
const FORM_MAX_WIDTH = 400;
const LOGO_W = 96;
const LOGO_H = 46;
/** iOS strong-password generator rules — mirror PASSWORD_RULES. */
const NEW_PASSWORD_RULES = 'minlength: 8; required: lower; required: upper; required: digit;';
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Sign-in%20help`;

/* ─────────── Text field ─────────── */

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Visible 12pt label above the field — also its accessibility label. */
  label: string;
  error?: string;
  Icon: FC<IconProps>;
  trailing?: ReactNode;
}

/**
 * Labelled, outlined input: 52pt pill, `borderStrong` 1pt outline, a 2pt
 * brand ring while focused, a danger outline + message on error.
 * forwardRef so react-hook-form's `setFocus` (return-key chaining) works.
 */
const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, Icon, trailing, onFocus, onBlur, ...inputProps }, ref) => {
    const scheme = useScheme();
    const themed = useThemedStyles(createStyles);
    const [focused, setFocused] = useState(false);

    const handleFocus = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );
    const handleBlur = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    return (
      <View style={styles.field}>
        {/* The input itself carries the label for screen readers. */}
        <AppText
          variant="caption"
          medium
          tone="secondary"
          accessibilityElementsHidden
          importantForAccessibility="no">
          {label}
        </AppText>
        <View
          style={[
            themed.inputShell,
            focused
              ? themed.inputShellFocused
              : error
              ? themed.inputShellError
              : null,
          ]}>
          <Icon size={ICON_SIZE_MD} color={scheme.textSecondary} />
          <AppTextInput
            ref={ref}
            style={styles.input}
            accessibilityLabel={error ? `${label}. ${error}` : label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...inputProps}
          />
          {trailing}
        </View>
        {error ? (
          <AppText variant="caption" tone="danger" style={styles.fieldError}>
            {error}
          </AppText>
        ) : null}
      </View>
    );
  },
);
TextField.displayName = 'TextField';

/* ─────────── Small pieces ─────────── */

const PasswordVisibilityToggle: FC<{ visible: boolean; onToggle: () => void }> = ({
  visible,
  onToggle,
}) => {
  const scheme = useScheme();
  return (
    <IconButton
      onPress={onToggle}
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      scaleTo={0.9}
      style={styles.trailingButton}>
      {visible ? (
        <EyeOffIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
      ) : (
        <EyeIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
      )}
    </IconButton>
  );
};

/** Inline sign-in failure — replaces the old native Alert. */
const AuthErrorBanner: FC<{ message: string }> = ({ message }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <View
      style={themed.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      testID="login-auth-error">
      <MaterialIcon
        name="error-outline"
        size={ICON_SIZE_MD}
        color={scheme.statusInk.danger}
      />
      <AppText variant="bodySm" tone="danger" style={styles.bannerText}>
        {message}
      </AppText>
    </View>
  );
};

/** Live new-password policy checklist — ticks per keystroke. */
const PasswordChecklist: FC<{ control: Control<NewPasswordFormValues> }> = ({
  control,
}) => {
  const scheme = useScheme();
  const value = useWatch({ control, name: 'newPassword' });
  const rules = useMemo(() => passwordRuleStatus(value), [value]);
  return (
    <View style={styles.checklist}>
      {rules.map(rule => (
        <View
          key={rule.key}
          style={styles.checkItem}
          accessible
          accessibilityLabel={`${rule.spoken}, ${rule.met ? 'met' : 'not met'}`}>
          <MaterialIcon
            name={rule.met ? 'check-circle' : 'radio-button-unchecked'}
            size={16}
            color={rule.met ? scheme.brandText : scheme.textTertiary}
          />
          <AppText
            variant="caption"
            medium={rule.met}
            color={rule.met ? scheme.brandText : scheme.textSecondary}>
            {rule.label}
          </AppText>
        </View>
      ))}
    </View>
  );
};

/** Secondary text action with a real ≥ touch.min target. */
const TextAction: FC<{
  onPress: () => void;
  label: string;
  role?: 'button' | 'link';
  hint?: string;
  disabled?: boolean;
  children: ReactNode;
}> = ({ onPress, label, role = 'button', hint, disabled, children }) => (
  <PressableScale
    onPress={onPress}
    role={role}
    disabled={disabled}
    scaleTo={0.97}
    accessibilityLabel={label}
    accessibilityHint={hint}
    style={styles.textAction}>
    {children}
  </PressableScale>
);

/* ─────────── Screen ─────────── */

const Login: FC = () => {
  const {
    control,
    errors,
    onSubmit,
    loading,
    focusPassword,
    authError,
    clearAuthError,
    requiresNewPassword,
    newPasswordControl,
    onSubmitNewPassword,
    newPasswordErrors,
    focusConfirmPassword,
    switchAccount,
  } = useLogin();
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Android announces the banner through its live region; iOS has no live
  // regions, so VoiceOver is told explicitly.
  useEffect(() => {
    if (authError && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(authError.message);
    }
  }, [authError]);

  const toggleShowPassword = useCallback(() => setShowPassword(v => !v), []);
  const toggleShowNewPassword = useCallback(
    () => setShowNewPassword(v => !v),
    [],
  );
  // handleSubmit-wrapped submitters return a promise that never rejects
  // (useLogin catches everything into the banner); drop it here.
  const submitSignIn = () => {
    onSubmit();
  };
  const submitNewPassword = () => {
    onSubmitNewPassword();
  };
  const switchToAnotherAccount = () => {
    switchAccount();
  };
  const openTerms = useCallback(
    () => navigation.navigate('TermsAndConditions'),
    [navigation],
  );
  const openPrivacy = useCallback(() => {
    if (PRIVACY_POLICY_URL) openExternalUrl(PRIVACY_POLICY_URL);
  }, []);
  const contactSupport = useCallback(
    () => openExternalUrl(SUPPORT_MAILTO),
    [],
  );

  /** Editing after a failure dismisses the stale banner. */
  const withClear = useCallback(
    (onChange: (v: string) => void) => (v: string) => {
      if (authError) clearAuthError();
      onChange(v);
    },
    [authError, clearAuthError],
  );

  const ctaLabel = requiresNewPassword ? 'Set password' : 'Sign in';

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
              {/* Vector mark, theme-aware ink: the bundled logo.png is the
                  light-background artwork and vanishes on dark. */}
              <PESLogo width={LOGO_W} height={LOGO_H} />
              <AppText variant="h2" center accessibilityRole="header">
                {requiresNewPassword ? 'Set a new password' : 'Welcome back'}
              </AppText>
              <AppText variant="bodySm" tone="secondary" center>
                {requiresNewPassword
                  ? 'Your account needs a new password before you can continue.'
                  : 'Sign in to monitor your sites.'}
              </AppText>
            </View>

            <View style={styles.formContainer}>
              {!requiresNewPassword ? (
                <View style={styles.inputsContainer}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <TextField
                        ref={ref}
                        label="Email"
                        Icon={EmailPlainIcon}
                        error={errors.email?.message}
                        placeholder="name@company.com"
                        value={value}
                        onChangeText={withClear(onChange)}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        textContentType="username"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={focusPassword}
                        editable={!loading}
                        testID="login-email"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <TextField
                        ref={ref}
                        label="Password"
                        Icon={PasswordIcon}
                        error={errors.password?.message}
                        placeholder="Your password"
                        value={value}
                        onChangeText={withClear(onChange)}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        textContentType="password"
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={submitSignIn}
                        editable={!loading}
                        testID="login-password"
                        trailing={
                          <PasswordVisibilityToggle
                            visible={showPassword}
                            onToggle={toggleShowPassword}
                          />
                        }
                      />
                    )}
                  />
                </View>
              ) : (
                <View style={styles.inputsContainer}>
                  <View style={styles.field}>
                    <Controller
                      control={newPasswordControl}
                      name="newPassword"
                      render={({ field: { onChange, onBlur, value, ref } }) => (
                        <TextField
                          ref={ref}
                          label="New password"
                          Icon={PasswordIcon}
                          error={newPasswordErrors.newPassword?.message}
                          value={value}
                          onChangeText={withClear(onChange)}
                          onBlur={onBlur}
                          secureTextEntry={!showNewPassword}
                          textContentType="newPassword"
                          autoComplete="new-password"
                          passwordRules={NEW_PASSWORD_RULES}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          submitBehavior="submit"
                          onSubmitEditing={focusConfirmPassword}
                          editable={!loading}
                          testID="login-new-password"
                          trailing={
                            <PasswordVisibilityToggle
                              visible={showNewPassword}
                              onToggle={toggleShowNewPassword}
                            />
                          }
                        />
                      )}
                    />
                    <PasswordChecklist control={newPasswordControl} />
                  </View>
                  <Controller
                    control={newPasswordControl}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <TextField
                        ref={ref}
                        label="Confirm password"
                        Icon={PasswordIcon}
                        error={newPasswordErrors.confirmPassword?.message}
                        value={value}
                        onChangeText={withClear(onChange)}
                        onBlur={onBlur}
                        secureTextEntry={!showNewPassword}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        passwordRules={NEW_PASSWORD_RULES}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={submitNewPassword}
                        editable={!loading}
                        testID="login-confirm-password"
                      />
                    )}
                  />
                </View>
              )}

              {authError ? <AuthErrorBanner message={authError.message} /> : null}

              <PressableScale
                onPress={requiresNewPassword ? submitNewPassword : submitSignIn}
                disabled={loading}
                busy={loading}
                accessibilityLabel={ctaLabel}
                style={themed.cta}
                testID="login-submit">
                {loading ? (
                  <ActivityIndicator color={scheme.textOnBrand} />
                ) : (
                  <AppText variant="bodyLg" semi_bold tone="onBrand">
                    {ctaLabel}
                  </AppText>
                )}
              </PressableScale>

              <View style={styles.secondaryActions}>
                {requiresNewPassword ? (
                  <TextAction
                    onPress={switchToAnotherAccount}
                    label="Use a different account"
                    disabled={loading}>
                    <AppText variant="bodySm" semi_bold tone="brand">
                      Use a different account
                    </AppText>
                  </TextAction>
                ) : null}
                <TextAction
                  onPress={contactSupport}
                  role="link"
                  label="Trouble signing in? Contact support"
                  hint="Opens Mail">
                  <AppText variant="bodySm" tone="secondary" center>
                    Trouble signing in?{' '}
                    <AppText variant="bodySm" semi_bold tone="brand">
                      Contact support
                    </AppText>
                  </AppText>
                </TextAction>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <AppText variant="caption" tone="secondary" center>
              By signing in, you agree to the {COMPANY_NAME}
            </AppText>
            <View style={styles.legalRow}>
              <TextAction
                onPress={openTerms}
                role="link"
                label="Terms of Use"
                hint="Opens the terms">
                <AppText variant="caption" semi_bold tone="brand" style={styles.underline}>
                  Terms of Use
                </AppText>
              </TextAction>
              <AppText variant="caption" tone="secondary">
                and
              </AppText>
              {PRIVACY_POLICY_URL ? (
                <TextAction
                  onPress={openPrivacy}
                  role="link"
                  label="Privacy Policy"
                  hint="Opens in your browser">
                  <AppText variant="caption" semi_bold tone="brand" style={styles.underline}>
                    Privacy Policy
                  </AppText>
                </TextAction>
              ) : (
                // No hosted policy yet — plain text, not a fake link.
                <AppText variant="caption" semi_bold tone="secondary">
                  Privacy Policy
                </AppText>
              )}
            </View>
          </View>
        </ScrollContainer>
      </BaseKeyboardAvoid>
    </ScreenContainer>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      height: FIELD_HEIGHT,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.borderStrong,
      borderRadius: radius.pill,
      paddingLeft: space.lg,
      paddingRight: space.sm,
      gap: space.sm,
    },
    // 2pt ring; padding shrinks by the extra 1pt so the content never
    // shifts. brandText (not the brand fill) keeps the ring ≥3:1 on light.
    inputShellFocused: {
      borderWidth: 2,
      borderColor: scheme.brandText,
      paddingLeft: space.lg - 1,
      paddingRight: space.sm - 1,
    },
    inputShellError: {
      borderColor: scheme.statusInk.danger,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.sm,
      padding: space.md,
      borderRadius: radius.md,
      backgroundColor: scheme.statusSoft.danger,
    },
    cta: {
      backgroundColor: scheme.brand,
      height: FIELD_HEIGHT,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
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
    paddingHorizontal: space['2xl'],
    paddingTop: space['4xl'],
  },
  headerContainer: {
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space['3xl'],
  },
  formContainer: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    gap: space.xl,
  },
  inputsContainer: {
    gap: space.lg,
  },
  field: {
    gap: space.xs,
  },
  fieldError: {
    marginLeft: space.lg,
  },
  input: {
    flex: 1,
  },
  trailingButton: {
    marginLeft: -space.xs,
  },
  bannerText: {
    flex: 1,
  },
  checklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.xs,
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  checkItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  secondaryActions: {
    alignItems: 'center',
    marginTop: -space.sm,
  },
  textAction: {
    minHeight: touch.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.sm,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    paddingTop: space.sm,
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

export default Login;
