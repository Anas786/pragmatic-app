import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Eclipseshapetop from '../components/eclipseshapetop';
import Eclipseshapebottom from '../components/eclipseshapebottom';
import { getFontFamily } from '../assets/utils/fontfamily';
import { TextInput } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function Loginscreen() {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();
  const handlelogin = () => {
    let adminemail = 'pes@pes.com';
    let adminpass = '123456';
    if (adminemail === email && adminpass === password) {
      const timer = setTimeout(() => {
        navigation.replace('Tabbar');
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      Alert.alert(
        'Not authenticated',
        'Email or password is incorrect or not filled',
      );
    }
  };
  return (
    <SafeAreaView style={styles.loginview}>
      <Eclipseshapetop pointerEvents="none" />
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
                style={styles.logoimage}
                source={require('../assets/splashlogo.png')}
              />
              <Text style={styles.welcometext}>Welcome</Text>
              <Text style={styles.desctext}>
                Please enter your email/phone or connect to your {`\n`}accounts
                to continue.
              </Text>
            </View>
            <View style={styles.loginfieldview}>
              <Text style={styles.label}>Email/Phone</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome6 name="envelope" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Email or Phone"
                  placeholderTextColor="#6e6e6e"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome6 name="lock" iconStyle='solid' style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#6e6e6e"
                  secureTextEntry={true}
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
                  style={[styles.checkbox, rememberMe && styles.checkboxActive]}
                >
                  {rememberMe === true ? (
                    <FontAwesome6
                      name="check"
                      iconStyle="solid"
                      size={12}
                      color="#ffffff"
                    />
                  ) : null}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlelogin}
                style={styles.loginButton}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.loginbottom}>
              <Text style={styles.bottomtext}>
                By clicking Continue, you agree to Dart{'\n'}
                <Text style={styles.linktext}>Terms of Use</Text> and{' '}
                <Text style={styles.linktext}>Privacy Policy</Text>.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Eclipseshapebottom pointerEvents="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginview: {
    flex: 1,
    backgroundColor: '#151314',
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
    lineHeight: '120%',
    color: '#ffffff',
    textAlign: 'center',
  },
  desctext: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: '120%',
    color: '#6e6e6e',
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
    color: '#ffffff',
    fontSize: 14,
    fontFamily: getFontFamily('true', 'medium'),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 190,
    height: 52,
    paddingHorizontal: 20,
    borderWidth: 1,
    marginTop: 3,
    marginBottom: 12,
    borderColor: '#a1a1a1',
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000',
    fontSize: 14,
    fontFamily: getFontFamily('true', 'light'),
    paddingBottom: 5,
  },
  icon: {
    color: '#3f3f46',
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
    backgroundColor: '#ffffff',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#08820E',
    backgroundColor: '#08820E',
  },
  rememberMeText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: getFontFamily('true', 'medium'),
  },
  loginButton: {
    backgroundColor: '#00a908',
    borderRadius: 100,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00a908',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: getFontFamily('true', 'semibold'),
  },
  loginbottom: {
    marginTop: 'auto',
    alignItems: 'center',
    marginBottom: 30,
  },
  bottomtext: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'regular'),
    color: '#ffffff',
    textAlign: 'center',
    paddingTop: 30,
  },
  linktext: {
    fontFamily: getFontFamily('true', 'semibold'),
    color: '#00a908',
  },
});
