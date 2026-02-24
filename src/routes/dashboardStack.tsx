import React, { ReactElement } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardStackParamList } from 'src/types';
import { Dashboard, SiteDetail } from 'src/components/screens';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export const DashboardStack = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Dashboard} name="Dashboard" />
    <Stack.Screen component={SiteDetail} name="SiteDetail" />
  </Stack.Navigator>
);
