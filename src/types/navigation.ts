import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
  Drawer: NavigatorScreenParams<DrawerParamList> | undefined;
};

export type OnboardingStackParamList = {
  Splash: undefined;
  Login: undefined;
};

export type DrawerParamList = {
  DashboardStack: NavigatorScreenParams<DashboardStackParamList>;
  Profile: undefined;
  AboutUs: undefined;
  ContactUs: undefined;
  TermsAndConditions: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  SiteDetail: {
    siteId: string;
    siteName: string;
    siteSubtitle: string;
    efficiency: number;
  };
};
