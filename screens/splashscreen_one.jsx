import { StyleSheet, View } from 'react-native';
import React, { useEffect } from 'react';
import LottieView from 'lottie-react-native';
import Eclipseshapetop from '../components/eclipseshapetop';
import Eclipseshapebottom from '../components/eclipseshapebottom';
import { useNavigation } from '@react-navigation/native';

const SplashScreenone = () => {
  const navigation = useNavigation();
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('SplashTwo');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.splashview}>
      <Eclipseshapetop />
      <View style={styles.gifloader}>
        <LottieView
          style={styles.gif}
          source={require('../assets/LOADINGLINH.json')}
          autoPlay
          loop
          speed={0.9}
        />
      </View>
      <Eclipseshapebottom />
    </View>
  );
};

const styles = StyleSheet.create({
  splashview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151314',
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
