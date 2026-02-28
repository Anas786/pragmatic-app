import React, { ReactElement } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from 'src/types';
import { Onboarding } from './onboardingStack';
import { DrawerNavigator } from './drawerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Routes = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Onboarding} name="Onboarding" />
    <Stack.Screen component={DrawerNavigator} name="Drawer" />
  </Stack.Navigator>
);
