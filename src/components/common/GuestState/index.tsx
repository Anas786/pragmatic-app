/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { normalizeWidth } from 'src/utils';
import AppText from '../AppText';
import Spacer from '../Spacer';
import Row from '../Row';
import Button from '../Button';
import { useNavigation } from '@react-navigation/native';
import { OnboardingScreenProps } from 'src/types';

interface GuestStateProps {
  message?: string;
}

const GuestState: FC<GuestStateProps> = ({ message }) => {
  const { navigate } =
    useNavigation<OnboardingScreenProps<'Splash'>['navigation']>();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {message ? (
        <AppText fontSize={18} center>
          {message}
        </AppText>
      ) : null}
      <Spacer mv={10} />

      <Row
        style={{
          justifyContent: 'space-between',
        }}>
        <Button
          title={t('sign_up')}
          type="secondary"
          width={170}
          onPress={() => navigate('SignUp')}
        />
        <Button
          title={t('login')}
          width={170}
          onPress={() => navigate('Login')}
        />
      </Row>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: normalizeWidth(350),
    alignSelf: 'center',
  },
});

export default GuestState;
