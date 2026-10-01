import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
  Drawer: NavigatorScreenParams<DrawerParamList> | undefined;
};

export type OnboardingStackParamList = {
  Login: undefined;
  /** Terms reachable from the Login screen's legal line. */
  TermsAndConditions: undefined;
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
    /**
     * Seeds the header's freshness status before `/data/all` lands — the
     * site-list values the Dashboard card was showing. All optional so
     * existing navigations keep compiling.
     */
    state?: string | null;
    dataLastUpdate?: number | string | null;
    capacityKw?: number | null;
  };
  /** Energy-flow diagram, presented full-screen in landscape. */
  SLDFullscreen: {
    siteId: string;
  };
  /** Info screens pushed on the stack (so Back returns to where you were). */
  Profile: undefined;
  AboutUs: undefined;
  ContactUs: undefined;
  TermsAndConditions: undefined;
};
