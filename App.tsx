import React from 'react';
import SplashScreenone from './screens/splashscreen_one';
import SplashScreentwo from './screens/splashscreen_two';
import Loginscreen from './auth/loginscreen';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { RootStackParamList } from './types/navigation';
import Themestore from './store/themestore';
import { StatusBar } from 'react-native';
import { darkTheme } from './theme/color';
import Tabbar from './components/tabbar';
import Editpersonalinfo from './screens/editpersonalinfo';
import Editpassword from './screens/editpassword';
import Deactivateaccount from './screens/deactivateaccount';
import Termsandcondition from './screens/termsandcondition';
import Headerleft from './components/headerleftsecondary';
import { getFontFamily } from './assets/utils/fontfamily';
import Headerrightsecondary from './components/headerrightsecondary';
import HeaderCenterSecondary from './components/headercentersecondary';
import Companydetailscreen from './screens/companydetailscreen';

const Stack = createStackNavigator<RootStackParamList>();
const App: React.FC = () => {
  const theme = Themestore(state => state.theme);

  return (
    <>
      <StatusBar
        barStyle={theme === darkTheme ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />

      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animationTypeForReplace: 'push',
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            options={{ gestureEnabled: false }}
            name="SplashOne"
            component={SplashScreenone}
          />
          <Stack.Screen
            options={{ gestureEnabled: false }}
            name="SplashTwo"
            component={SplashScreentwo}
          />
          <Stack.Screen
            options={{ gestureEnabled: false }}
            name="Loginscreen"
            component={Loginscreen}
          />
          <Stack.Screen
            options={{ gestureEnabled: false }}
            name="Tabbar"
            component={Tabbar}
          />
          <Stack.Screen
            options={{
              gestureEnabled: false,
              headerShown: true,
              headerTitle: 'Personal Information',
              headerTitleAlign: 'center',
              headerStyle: {
                backgroundColor: theme.colors.overlaybackground,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.bordercolor,
              },
              headerTitleStyle: {
                fontSize: 12,
                fontFamily: getFontFamily('true', 'medium'),
                lineHeight: 18,
                color: theme.colors.title,
                paddingTop: 8,
              },
              headerLeft: () => <Headerleft />
            }}
            name="Editpersonalinfo"
            component={Editpersonalinfo}
          />
          <Stack.Screen
            options={{
              gestureEnabled: false,
              headerShown: true,
              headerTitle: 'Password',
              headerTitleAlign: 'center',
              headerStyle: {
                backgroundColor: theme.colors.overlaybackground,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.bordercolor,
              },
              headerTitleStyle: {
                fontSize: 12,
                fontFamily: getFontFamily('true', 'medium'),
                lineHeight: 18,
                color: theme.colors.title,
                paddingTop: 8,
              },
              headerLeft: () => <Headerleft />
            }}
            name="Editpassword"
            component={Editpassword}
          />
          <Stack.Screen
            options={{
              gestureEnabled: false,
              headerShown: true,
              headerTitle: 'Account Deactivate',
              headerTitleAlign: 'center',
              headerStyle: {
                backgroundColor: theme.colors.overlaybackground,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.bordercolor,
              },
              headerTitleStyle: {
                fontSize: 12,
                fontFamily: getFontFamily('true', 'medium'),
                lineHeight: 18,
                color: theme.colors.title,
                paddingTop: 8,
              },
              headerLeft: () => <Headerleft />
            }}
            name="Deactivateaccount"
            component={Deactivateaccount}
          />
          <Stack.Screen
            options={{
              gestureEnabled: false,
              headerShown: true,
              headerTitle: 'Terms and Condition',
              headerTitleAlign: 'center',
              headerStyle: {
                backgroundColor: theme.colors.overlaybackground,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.bordercolor,
              },
              headerTitleStyle: {
                fontSize: 12,
                fontFamily: getFontFamily('true', 'medium'),
                lineHeight: 18,
                color: theme.colors.title,
                paddingTop: 8,
              },
              headerLeft: () => <Headerleft />
            }}
            name="Termsandcondition"
            component={Termsandcondition}
          />
          <Stack.Screen
            options={{
              gestureEnabled: false,
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.overlaybackground,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.bordercolor,
              },
              headerTitleAlign: 'center',
              headerTitle: () => <HeaderCenterSecondary />,
              headerLeft: () => <Headerleft />,
              headerRight: () => <Headerrightsecondary />
            }}
            name="Companydetailscreen"
            component={Companydetailscreen}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
