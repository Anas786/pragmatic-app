import { StyleSheet, View } from 'react-native';
import React, { useEffect } from 'react';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import Themestore from '../../store/themestore';

const SplashScreenone: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = Themestore(state => state.theme);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('SplashTwo');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.splashview, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gifloader}>
        <LottieView
          style={styles.gif}
          source={require('../../assets/LOADINGLINH.json')}
          autoPlay
          loop
          speed={0.9}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  splashview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifloader: {
    zIndex: 1,
  },
  gif: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
});

export default SplashScreenone;
