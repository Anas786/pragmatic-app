import React from 'react';
import SplashScreenone from './screens/splashscreen_one';
import SplashScreentwo from './screens/splashscreen_two';
import Loginscreen from './auth/loginscreen';
import Tabbar from './components/tabbar';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

const Stack = createStackNavigator();
const App = () => {
  return (
    <>
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
