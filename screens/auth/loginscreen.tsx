import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  // Alert,
  ImageStyle,
} from 'react-native';
import { getFontFamily } from '../../assets/utils/fontfamily';
import { TextInput } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import Themestore from '../../store/themestore';

export default function Loginscreen() {
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = Themestore(state => state.theme);

  const handlelogin = (): void => {
    // const adminemail: string = 'pes@pes.com';
    // const adminpass: string = '123456';
    // if (adminemail === email && adminpass === password) {
      // setTimeout(() => {
        navigation.replace('Tabbar');
      // }, 3000);
    // } else {
    //   Alert.alert(
    //     'Not authenticated',
    //     'Email or password is incorrect or not filled',
    //   );
    // }
  };
  return (
    <SafeAreaView style={[styles.loginview, {backgroundColor: theme.colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, paddingTop: 100, paddingBottom: 50 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          scrollEventThrottle={16}
        >
          <View style={styles.logincontainer}>
            <View style={styles.logintop}>
              <Image
                style={styles.logoimage as ImageStyle}
                source={require('../../assets/splashlogo.png')}
              />
              <Text style={[styles.welcometext, {color: theme.colors.title}]}>Welcome</Text>
              <Text style={[styles.desctext, {color: theme.colors.text}]}>
                Please enter your email/phone or connect to your {`\n`}accounts
                to continue.
              </Text>
            </View>
            <View style={styles.loginfieldview}>
              <Text style={[styles.label, {color: theme.colors.text}]}>Email/Phone</Text>
              <View style={[styles.inputWrapper, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}>
                <FontAwesome6 name="envelope" style={[styles.icon, {color: theme.colors.inputicon}]} />
                <TextInput
                  style={[styles.input, {color: theme.colors.text}]}
                  placeholder="Email or Phone"
                  placeholderTextColor={theme.colors.text}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <Text style={[styles.label, {color: theme.colors.text}]}>Password</Text>
              <View style={[styles.inputWrapper, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}>
                <FontAwesome6 name="lock" iconStyle="solid" style={[styles.icon, {color: theme.colors.inputicon}]} />
                <TextInput
                  style={[styles.input, {color: theme.colors.text}]}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.text}
                  secureTextEntry={false}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                activeOpacity={0.8}
                onPress={() => setRememberMe(prev => !prev)}
              >
                <View
                  style={[styles.checkbox, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder }, rememberMe && styles.checkboxActive]}
                >
                  {rememberMe ? (
                    <FontAwesome6
                      name="check"
                      iconStyle="solid"
                      size={12}
                      color="#ffffff"
                    />
                  ) : null}
                </View>
                <Text style={[styles.rememberMeText, {color: theme.colors.text}]}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlelogin}
                style={[styles.loginButton, {backgroundColor: theme.colors.buttonbg, borderColor: theme.colors.buttonborder}]}
                activeOpacity={0.8}
              >
                <Text style={[styles.loginButtonText, {color: theme.colors.buttontext}]}>Login</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.loginbottom}>
              <Text style={[styles.bottomtext, {color: theme.colors.title}]}>
                By clicking Continue, you agree to Dart{'\n'}
                <Text style={styles.linktext}>Terms of Use</Text> and{' '}
                <Text style={styles.linktext}>Privacy Policy</Text>.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginview: {
    flex: 1,
    position: 'relative',
  },
  logintop: {
    marginTop: 'auto',
  },
  logoimage: {
    width: 85,
    height: 58,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  welcometext: {
    fontSize: 20,
    fontFamily: getFontFamily('true', 'medium'),
    paddingTop: 20,
    textAlign: 'center',
  },
  desctext: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'regular'),
    paddingTop: 8,
    textAlign: 'center',
  },
  logincontainer: {
    paddingHorizontal: 28,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  loginfieldview: {
    paddingTop: 30,
  },
  label: {
    fontSize: 14,
    fontFamily: getFontFamily('true', 'medium'),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    height: 52,
    paddingHorizontal: 20,
    borderWidth: 1,
    marginTop: 3,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: getFontFamily('true', 'light'),
    paddingBottom: 5,
  },
  icon: {
    width: 20,
    height: 20,
    fontSize: 18,
    verticalAlign: 'middle',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#08820E',
    backgroundColor: '#08820E',
  },
  rememberMeText: {
    fontSize: 14,
    fontFamily: getFontFamily('true', 'medium'),
  },
  loginButton: {
    borderRadius: 100,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: getFontFamily('true', 'semibold'),
  },
  loginbottom: {
    marginTop: 'auto',
    alignItems: 'center',
    marginBottom: 0,
  },
  bottomtext: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#ffffff',
    textAlign: 'center',
    paddingTop: 90,
  },
  linktext: {
    fontFamily: getFontFamily('true', 'semibold'),
    color: '#00a908',
  },
});
