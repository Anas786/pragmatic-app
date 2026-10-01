import React, { ReactElement } from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { DashboardStackParamList } from 'src/types';
// Direct file imports — the screens barrel's export-star chain synchronously
// evaluates the entire Authenticated tree, defeating Metro's inlineRequires.
import Dashboard from 'src/components/screens/Authenticated/Dashboard';
import SiteDetail from 'src/components/screens/Authenticated/SiteDetail';
import SLDFullscreenScreen from 'src/components/screens/Authenticated/SiteDetail/components/SLDFullscreenScreen';
import AboutUs from 'src/components/screens/Authenticated/AboutUs';
import ContactUs from 'src/components/screens/Authenticated/ContactUs';
import Profile from 'src/components/screens/Authenticated/Profile';
import TermsAndConditions from 'src/components/screens/Authenticated/TermsAndConditions';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

/**
 * Info screens opened from the drawer are ordinary pushes: slide in from
 * the right (the native push on iOS), iOS edge-swipe back and the Android
 * back button return to wherever the user was.
 */
const INFO_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  gestureEnabled: true,
};

export const DashboardStack = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen component={Dashboard} name="Dashboard" />
    <Stack.Screen component={SiteDetail} name="SiteDetail" />
    <Stack.Screen
      component={SLDFullscreenScreen}
      name="SLDFullscreen"
      options={{ presentation: 'fullScreenModal', animation: 'fade' }}
    />
    <Stack.Group screenOptions={INFO_SCREEN_OPTIONS}>
      <Stack.Screen component={Profile} name="Profile" />
      <Stack.Screen component={AboutUs} name="AboutUs" />
      <Stack.Screen component={ContactUs} name="ContactUs" />
      <Stack.Screen component={TermsAndConditions} name="TermsAndConditions" />
    </Stack.Group>
  </Stack.Navigator>
);
