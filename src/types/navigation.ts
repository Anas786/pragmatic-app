import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Dashboard: undefined;
};

export type OnboardingStackParamList = {
  Splash: undefined;
  Login: undefined;
};

export type AuthenticatedStackParamList = {
  SetupProfile: undefined;
  MainTabs: undefined;
};

