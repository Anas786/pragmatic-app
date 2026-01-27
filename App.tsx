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
            options={{ gestureEnabled: false}}
            name="Tabbar"
            component={Tabbar}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
