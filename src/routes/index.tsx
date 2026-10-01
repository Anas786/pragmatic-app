import React, { ReactElement } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from 'src/types';
import { Onboarding } from './onboardingStack';
import { DrawerNavigator } from './drawerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RoutesProps {
  /**
   * Decided by the cold-start SplashOverlay from the restored session
   * ('Drawer' when signed in, 'Onboarding' → Login otherwise). Routes are
   * mounted only once it is known — there is no Splash route any more.
   */
  initialRouteName: keyof RootStackParamList;
}

export const Routes = ({ initialRouteName }: RoutesProps): ReactElement => (
  <Stack.Navigator
    initialRouteName={initialRouteName}
    screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Onboarding} name="Onboarding" />
    <Stack.Screen component={DrawerNavigator} name="Drawer" />
  </Stack.Navigator>
);
