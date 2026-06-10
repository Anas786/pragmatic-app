import React, { ReactElement } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardStackParamList } from 'src/types';
import { Dashboard, SiteDetail } from 'src/components/screens';
import SLDFullscreenScreen from 'src/components/screens/Authenticated/SiteDetail/components/SLDFullscreenScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export const DashboardStack = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Dashboard} name="Dashboard" />
    <Stack.Screen component={SiteDetail} name="SiteDetail" />
    <Stack.Screen
      component={SLDFullscreenScreen}
      name="SLDFullscreen"
      options={{ presentation: 'fullScreenModal', animation: 'fade' }}
    />
  </Stack.Navigator>
);
