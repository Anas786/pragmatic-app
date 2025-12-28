import { StyleSheet, Text, View, Image } from 'react-native';
import Eclipseshapetop from '../components/eclipseshapetop';
import Eclipseshapebottom from '../components/eclipseshapebottom';
import { getFontFamily } from '../assets/utils/fontfamily';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

export default function SplashScreentwo() {
  const navigation = useNavigation()
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Loginscreen');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.splashview}>
      <Eclipseshapetop />
      <View style={styles.splashlogo}>
        <Image
          style={styles.logo}
          source={require('../assets/splashlogo.png')}
        />
        <Text style={styles.logotext}>Pragmatics Engineering Solution</Text>
      </View>
      <Eclipseshapebottom />
    </View>
  );
}

const styles = StyleSheet.create({
  splashview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151314',
  },
  logo: {
    width: 120,
    height: 81,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  logotext: {
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 10,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#ffffff',
  },
});
