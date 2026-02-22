import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
import {
  Login,
  SignUp,
  Splash,
  Verify,
  Welcome,
} from 'src/components';
import { OnboardingStackParamList } from 'src/types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
export const Onboarding = (): ReactElement => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Splash" component={Splash} />
    <OnboardingStack.Screen name="Welcome" component={Welcome} />
    <OnboardingStack.Screen name="SignUp" component={SignUp} />
    <OnboardingStack.Screen name="Login" component={Login} />
    <OnboardingStack.Screen name="Verify" component={Verify} />
  </OnboardingStack.Navigator>
);
