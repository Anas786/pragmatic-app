import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Dashboard: undefined;
};

export type OnboardingStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Verify: {
    origin: 'signup' | 'login';
    email: string;
  };
  Authenticated: undefined;
  PortableStorageStack: undefined;
};

export type AuthenticatedStackParamList = {
  SetupProfile: undefined;
  MainTabs: undefined;
};

