import React, { FC, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from 'src/components/common';
import { useLogin } from 'src/hooks';
import {
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  LOGIN_BUTTON_BG,
  normalizeHeight,
  normalizeWidth,
  SPLASH_BG,
  TERMS_LINK,
  TEXT_SECONDARY,
  WHITE,
  FONT_SIZE_XL,
  FONT_SIZE_XS,
  FONT_SIZE_MD,
} from 'src/utils';
import { Logo } from 'src/assets';

const EmailIcon = () => (
  <View style={styles.iconContainer}>
    <AppText color={TEXT_SECONDARY} fontSize={FONT_SIZE_MD}>✉</AppText>
  </View>
);

const LockIcon = () => (
  <View style={styles.iconContainer}>
    <AppText color={TEXT_SECONDARY} fontSize={FONT_SIZE_MD}>🔒</AppText>
  </View>
);

const CheckIcon = () => (
  <AppText color={LOGIN_BUTTON_BG} fontSize={FONT_SIZE_XS} bold>✓</AppText>
);

const Login: FC = () => {
  const { control, onSubmit, loading } = useLogin();
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SPLASH_BG} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
              <AppText color={WHITE} fontSize={FONT_SIZE_XL} medium>
                Welcome
              </AppText>
            </View>
            <AppText
              color={TEXT_SECONDARY}
              fontSize={FONT_SIZE_XS}
              center
              style={styles.subtitle}>
              Please enter your email/phone or connect to your accounts to
              continue.
            </AppText>
            </View>

            <View style={styles.formContainer}>
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
                        placeholderTextColor={TEXT_SECONDARY}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
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
                        placeholderTextColor={TEXT_SECONDARY}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                      />
                    </View>
                  )}
                />

                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <View style={styles.checkbox}>
                    {rememberMe && <CheckIcon />}
                  </View>
                  <AppText color={WHITE} fontSize={FONT_SIZE_XS} medium>
                    Remember Me
                  </AppText>
                </TouchableOpacity>
              </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={onSubmit}
              disabled={loading}>
              <AppText color={WHITE} fontSize={FONT_SIZE_MD} semi_bold>
                Login
              </AppText>
            </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <AppText color={WHITE} fontSize={FONT_SIZE_XS} center style={styles.footerText}>
              By clicking Continue, you agree to Dart{' '}
              <AppText color={TERMS_LINK} fontSize={FONT_SIZE_XS} semi_bold>
                Terms of Use
              </AppText>{' '}
              and{' '}
              <AppText color={TERMS_LINK} fontSize={FONT_SIZE_XS} semi_bold>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
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
    gap: normalizeHeight(8),
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
    paddingHorizontal: normalizeWidth(10),
  },
  formContainer: {
    width: '100%',
    maxWidth: normalizeWidth(337),
    gap: normalizeHeight(20),
  },
  inputsContainer: {
    gap: normalizeHeight(16),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_DARK_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: normalizeHeight(100),
    height: normalizeHeight(44),
    paddingHorizontal: normalizeWidth(12),
    gap: normalizeWidth(8),
  },
  iconContainer: {
    width: normalizeWidth(20),
    height: normalizeHeight(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: FONT_SIZE_XS,
    fontFamily: 'Poppins-Regular',
    paddingVertical: 0,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(8),
  },
  checkbox: {
    width: normalizeWidth(18),
    height: normalizeWidth(18),
    borderWidth: 2,
    borderColor: LOGIN_BUTTON_BG,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    backgroundColor: LOGIN_BUTTON_BG,
    height: normalizeHeight(48),
    borderRadius: normalizeHeight(100),
    alignItems: 'center',
    justifyContent: 'center',
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
