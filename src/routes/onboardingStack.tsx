import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
// Direct file imports — the `src/components` barrel's export-star chain
// synchronously evaluates the entire Authenticated tree (~170 modules)
// during the splash's first render, defeating Metro's inlineRequires.
import Login from 'src/components/screens/Onboarding/Login';
import TermsAndConditions from 'src/components/screens/Authenticated/TermsAndConditions';
import { OnboardingStackParamList } from 'src/types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
export const Onboarding = (): ReactElement => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Login" component={Login} />
    {/* Pushed from the Login footer's "Terms of Use" link; Login stays
        mounted underneath, so typed credentials survive the round trip. */}
    <OnboardingStack.Screen
      name="TermsAndConditions"
      component={TermsAndConditions}
      options={{ animation: 'slide_from_right', gestureEnabled: true }}
    />
  </OnboardingStack.Navigator>
);
