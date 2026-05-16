import React, { FC, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "src/components/common";
import { useLogin } from "src/hooks";
import { useThemeStore } from "src/hooks/useThemeStore";
import {
  normalizeHeight,
  normalizeWidth,
  WHITE,
  FONT_SIZE_XL,
  FONT_SIZE_XS,
  FONT_SIZE_MD,
  ICON_SIZE_MD,
  ThemeColors,
} from "src/utils";
import { Logo } from "src/assets";
import {
  EmailPlainIcon,
  EyeIcon,
  EyeOffIcon,
  PasswordIcon,
} from "src/assets/icons";

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
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const EmailIcon = () => (
    <View style={styles.iconContainer}>
      <EmailPlainIcon size={ICON_SIZE_MD} />
    </View>
  );

  const LockIcon = () => (
    <View style={styles.iconContainer}>
      <PasswordIcon size={ICON_SIZE_MD} />
    </View>
  );

  const PasswordVisibilityToggle: FC<{
    visible: boolean;
    onToggle: () => void;
  }> = ({ visible, onToggle }) => (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      style={styles.iconContainer}>
      {visible ? (
        <EyeOffIcon size={ICON_SIZE_MD} color={colors.textSecondary} />
      ) : (
        <EyeIcon size={ICON_SIZE_MD} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.splashBg}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          >
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Image source={Logo} style={styles.logo} resizeMode="contain" />
                <AppText
                  color={colors.primaryText}
                  fontSize={FONT_SIZE_XL}
                  medium>
                  Welcome
                </AppText>
              </View>
              <AppText
                color={colors.textSecondary}
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
                        <View style={styles.inputWrapper}>
                          <EmailIcon />
                          <TextInput
                            style={styles.input}
                            placeholder="Email or Phone"
                            placeholderTextColor={colors.textSecondary}
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
                        <View style={styles.inputWrapper}>
                          <LockIcon />
                          <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={colors.textSecondary}
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
                          />
                        </View>
                      )}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={onSubmit}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color={WHITE} />
                    ) : (
                      <AppText color={WHITE} fontSize={FONT_SIZE_MD} semi_bold>
                        Login
                      </AppText>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <AppText
                    color={colors.primaryText}
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
                        <View style={styles.inputWrapper}>
                          <LockIcon />
                          <TextInput
                            style={styles.input}
                            placeholder="New password"
                            placeholderTextColor={colors.textSecondary}
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
                          />
                        </View>
                      )}
                    />
                    {newPasswordErrors.newPassword?.message ? (
                      <AppText
                        color={colors.termsLink}
                        fontSize={FONT_SIZE_XS}>
                        {newPasswordErrors.newPassword.message}
                      </AppText>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={onSubmitNewPassword}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color={WHITE} />
                    ) : (
                      <AppText color={WHITE} fontSize={FONT_SIZE_MD} semi_bold>
                        Set password &amp; continue
                      </AppText>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <AppText
              color={colors.primaryText}
              fontSize={FONT_SIZE_XS}
              center
              style={styles.footerText}>
              By clicking Continue, you agree to Dart{" "}
              <AppText
                color={colors.termsLink}
                fontSize={FONT_SIZE_XS}
                semi_bold>
                Terms of Use
              </AppText>{" "}
              and{" "}
              <AppText
                color={colors.termsLink}
                fontSize={FONT_SIZE_XS}
                semi_bold>
                Privacy Policy
              </AppText>
              .
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.splashBg,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "space-between",
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: normalizeWidth(28),
      paddingTop: normalizeHeight(40),
    },
    headerContainer: {
      alignItems: "center",
      gap: normalizeHeight(8),
      marginBottom: normalizeHeight(28),
    },
    logoContainer: {
      alignItems: "center",
      gap: normalizeHeight(28),
    },
    logo: {
      width: normalizeWidth(85),
      height: normalizeHeight(58),
    },
    subtitle: {
      maxWidth: normalizeWidth(309),
      lineHeight: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(10),
    },
    formContainer: {
      width: "100%",
      maxWidth: normalizeWidth(337),
      gap: normalizeHeight(20),
    },
    inputsContainer: {
      gap: normalizeHeight(16),
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeHeight(100),
      height: normalizeHeight(44),
      paddingHorizontal: normalizeWidth(12),
      gap: normalizeWidth(8),
    },
    iconContainer: {
      width: normalizeWidth(20),
      height: normalizeHeight(20),
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      color: colors.primaryText,
      fontSize: FONT_SIZE_XS,
      fontFamily: "Poppins-Regular",
      paddingVertical: 0,
    },
    loginButton: {
      backgroundColor: colors.loginButtonBg,
      height: normalizeHeight(48),
      borderRadius: normalizeHeight(100),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: normalizeHeight(20),
    },
    footer: {
      paddingHorizontal: normalizeWidth(20),
      paddingBottom: normalizeHeight(20),
      paddingTop: normalizeHeight(10),
    },
    footerText: {
      lineHeight: normalizeHeight(20),
    },
  });

export default Login;
