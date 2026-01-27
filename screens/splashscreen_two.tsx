import { StyleSheet, Text, View, Image } from 'react-native';
import { getFontFamily } from '../assets/utils/fontfamily';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import Themestore from '../store/themestore';

const SplashScreentwo: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = Themestore(state => state.theme);
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Loginscreen');
    }, 3000); 

    return () => clearTimeout(timer);
  }, [navigation]);
  return (
    <View style={[styles.splashview, {backgroundColor: theme.colors.background}]}>
      <View>
        <Image
          style={styles.logo}
          source={require('../assets/splashlogo.png')}
        />
        <Text style={[styles.logotext, {color: theme.colors.title}]}>Pragmatics Engineering Solution</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
export default SplashScreentwo;