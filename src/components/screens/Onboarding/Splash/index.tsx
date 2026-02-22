import React, { FC, useEffect } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from 'src/components/common';
import { Logo } from 'src/assets';
import { SPLASH_BG, WHITE, normalizeWidth, normalizeHeight, FONT_SIZE_MD } from 'src/utils';
import { OnboardingStackParamList } from 'src/types';

const Splash: FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SPLASH_BG} />

      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <AppText
          color={WHITE}
          fontSize={FONT_SIZE_MD}
          center
          lineHeight={20}
          style={styles.text}
        >
          Pragmatics Engineering Solution
        </AppText>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: normalizeWidth(20),
    gap: normalizeHeight(16),
  },
  logo: {
    width: normalizeWidth(120),
    height: normalizeHeight(81),
  },
  text: {
    maxWidth: normalizeWidth(259),
    textAlign: 'center',
    paddingHorizontal: normalizeWidth(10),
  },
});

export default Splash;
