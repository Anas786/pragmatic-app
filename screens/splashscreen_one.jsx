import { StyleSheet, View, Image } from 'react-native';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

const SplashScreenone = () => {
  return (
    <View style={styles.splashview}>
      <LinearGradient
        colors={['rgba(177, 177, 177, 0.15)', 'transparent']}
        style={[styles.eclipse, { top: -207, left: -298 }]}
      />
      <View style={styles.gifloader}>
        <LottieView
          style={styles.gif}
          source={require('../assets/LOADINGLINH.json')}
          autoPlay
          loop
          speed={0.9}
        />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(177, 177, 177, 0.15)']}
        style={[styles.eclipse, { top: 547, left: 155 }]}
      />
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
  eclipse: {
    position: 'absolute',
    width: 549,
    height: 549,
    borderRadius: 250,
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
