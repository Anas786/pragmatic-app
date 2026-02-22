import React, { FC } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import {
  BLUE,
  BORDER_GRAY,
  normalizeFont,
  normalizeHeight,
  normalizeWidth,
  RED,
} from 'src/utils';
import AppText from '../AppText';
import Spacer from '../Spacer';

interface OTPProps {
  error?: string;
  onChangeText: (text: string) => void;
}

const OTP: FC<OTPProps> = ({ error, onChangeText }) => {
  return (
    <View
      style={[
        styles.container,
        I18nManager.isRTL && styles.rtlContainer,
      ]}>
      <View style={I18nManager.isRTL && styles.rtlWrapper}>
        <OtpInput
          numberOfDigits={6}
          focusColor={BLUE}
          autoFocus={false}
          hideStick={true}
          placeholder="------"
          blurOnFilled={true}
          disabled={false}
          type="numeric"
          secureTextEntry={false}
          focusStickBlinkingDuration={500}
          onTextChange={onChangeText}
          textInputProps={{
            accessibilityLabel: 'One-Time Password',
          }}
          theme={{
            pinCodeContainerStyle: {
              ...styles.pinCodeContainerStyle,
              borderColor: error ? RED : BORDER_GRAY,
            },
            pinCodeTextStyle: styles.pinCodeTextStyle,
            focusedPinCodeContainerStyle: styles.focusedPinCodeContainerStyle,
          }}
        />
      </View>
      {error ? (
        <>
          <Spacer mt={10} />
          <AppText color={RED}>{error}</AppText>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    direction: 'ltr',
  },
  rtlContainer: {
    transform: [{ scaleX: -1 }],
  },
  rtlWrapper: {
    transform: [{ scaleX: -1 }],
  },
  pinCodeContainerStyle: {
    borderWidth: 1,
    borderRadius: 5,
    height: normalizeHeight(53.41),
    width: normalizeWidth(51.4),
  },
  pinCodeTextStyle: {
    fontSize: normalizeFont(24),
  },
  focusedPinCodeContainerStyle: {
    borderColor: BLUE,
  },
});

export default OTP;
