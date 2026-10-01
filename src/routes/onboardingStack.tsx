import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
// Direct file imports — the `src/components` barrel's export-star chain
// synchronously evaluates the entire Authenticated tree (~170 modules)
// during the splash's first render, defeating Metro's inlineRequires.
import Login from 'src/components/screens/Onboarding/Login';
import { OnboardingStackParamList } from 'src/types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
export const Onboarding = (): ReactElement => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Login" component={Login} />
  </OnboardingStack.Navigator>
);
