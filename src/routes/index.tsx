import React, { ReactElement } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from 'src/types';
import { Onboarding } from './onboardingStack';
import { Dashboard, SiteDetail } from 'src/components/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Routes = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Onboarding} name="Onboarding" />
    <Stack.Screen component={Dashboard} name="Dashboard" />
    <Stack.Screen component={SiteDetail} name="SiteDetail" />
  </Stack.Navigator>
);
