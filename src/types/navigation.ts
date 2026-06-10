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
    /**
     * Public CDN URL for the site logo (built via `buildSiteLogoUrl`),
     * or null when the site has no logo. SiteDetail falls back to the
     * site's two-letter initials in that case.
     */
    siteimage: string | null;
  };
  /** Energy-flow diagram, presented full-screen in landscape. */
  SLDFullscreen: {
    siteId: string;
  };
};
