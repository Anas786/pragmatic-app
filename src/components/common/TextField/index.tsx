/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import {
  BLUE,
  BORDER_GRAY,
  INPUT,
  normalizeFont,
  normalizeHeight,
  normalizeWidth,
  PLACEHOLDER_COLOR,
  RED,
} from 'src/utils';
import AppText from '../AppText';
import Spacer from '../Spacer';
import CustomIcon, { IconName } from '../CustomIcon';
import { useTranslation } from 'react-i18next';

interface TextFieldProps extends TextInputProps {
  label?: string;
  width?: number;
  type?: 'text' | 'phone';
  error?: string;
  icon?: IconName;
  height?: number;
  onPress?: () => void;
}

const TextField: FC<TextFieldProps> = ({
  label,
  type,
  width = 349,
  onBlur,
  onSubmitEditing,
  error = '',
  icon,
  height = 53.06,
  onPress,
  ...rest
}) => {
  const [focus, setFocus] = useState(rest.autoFocus);
  const {
    i18n: { language },
  } = useTranslation();

  const renderInputContainer = () => (
    <View
      style={{
        ...styles.inputContainer,
        borderColor: error ? RED : focus ? BLUE : BORDER_GRAY,
        height: normalizeHeight(height),
        width: type === 'phone' && language === 'ar' ? '70%' : '100%',
        paddingHorizontal: language === 'ar' && type === 'phone' ? normalizeWidth(30) : '2.5%',
        ...(language === 'ar'
          ? { flexDirection: 'row-reverse' }
          : { flexDirection: 'row' }),
      }}>
      {icon ? (
        <View>
          <CustomIcon name={icon} />
        </View>
      ) : null}
      <TextInput
        style={{
          ...styles.input,
          flex: type === 'phone' ? 1 : undefined,
          width: type === 'phone' ? undefined : '100%',
          textAlign: language === 'ar' ? 'right' : 'left',
          paddingHorizontal: 0,
          paddingRight: language === 'ar' ? normalizeWidth(30) : normalizeWidth(8),
          paddingLeft: language === 'ar' ? normalizeWidth(8) : normalizeWidth(12),
          ...(rest.multiline
            ? {
                paddingTop: normalizeHeight(15),
                paddingBottom: normalizeHeight(12),
              }
            : {}),
        }}
        placeholderTextColor={PLACEHOLDER_COLOR}
        onFocus={() => setFocus(true)}
        onBlur={e => {
          setFocus(false);
          onBlur?.(e);
        }}
        selectionColor={BLUE}
        onSubmitEditing={e => {
          setFocus(false);
          onSubmitEditing?.(e);
        }}
        pointerEvents={onPress ? 'none' : 'auto'}
        {...rest}
      />
    </View>
  );

  return (
    <View style={{ width: normalizeWidth(width) }}>
      {label ? (
        <>
          <AppText>{label}</AppText>
          <Spacer mt={8} />
        </>
      ) : null}
      <View
        style={{
          ...styles.innerContainer,
          ...(language === 'ar'
            ? { flexDirection: 'row-reverse' }
            : { flexDirection: 'row' }),
        }}>
        {type === 'phone' && (
          <View
            style={[
              styles.phoneContainer,
              { height: normalizeHeight(height) },
            ]}>
            <AppText fontSize={16}>{'🇸🇦 +966'}</AppText>
          </View>
        )}
        {type === 'phone' && <View style={{ width: normalizeWidth(5) }} />}
        {onPress ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
            {renderInputContainer()}
          </TouchableOpacity>
        ) : (
          renderInputContainer()
        )}
      </View>
      {error ? (
        <View>
          <Spacer mt={8} />
          <AppText color={RED}>{error}</AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    borderColor: BORDER_GRAY,
    paddingHorizontal: '2.5%',
  },
  input: {
    paddingHorizontal: '2.5%',
    height: '100%',
    color: INPUT,
    fontSize: normalizeFont(16),
    fontFamily: 'Poppins-Regular',
  },
  phoneContainer: {
    width: normalizeWidth(94.57),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    borderColor: BORDER_GRAY,
  },
});

export default TextField;
