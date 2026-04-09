export type ThemeColors = {
  // Backgrounds
  splashBg: string;
  inputDarkBg: string;
  cardBg: string;
  metricCardBg: string;
  dropdownBg: string;
  tabInactiveBg: string;
  progressBg: string;
  progressFilled: string;
  darkBgSecondary: string;
  rememberMeFilled: string;

  // Borders
  inputDarkBorder: string;

  // Text
  primaryText: string;
  textSecondary: string;

  // Overlays
  overlayDark: string;
  overlayLightBorder: string;
  overlayLightStrip: string;
  chartRuleColor: string;
  divider: string;

  // Buttons & links
  loginButtonBg: string;
  termsLink: string;

  // Bubbles (GradientRangeBar)
  bubbleTextDark: string;
  bubbleBg: string;

  //Chart (Pointer Color)
  chartpointercolor: string;

  // SLD / fullscreen
  fullscreenBg: string;
  controlButtonBg: string;

  // StatusBar
  statusBarStyle: "light-content" | "dark-content";

  // Navigation
  navigationBg: string;

  // Header
  headerBg: string;

  // Date filter
  dateFilterBg: string;
  dateFilterText: string;

  // Tabs
  tabActiveBg: string;
};

export const darkColors: ThemeColors = {
  splashBg: "#151314",
  inputDarkBg: "#1b1a1b",
  cardBg: "#171717",
  metricCardBg: "#1F1F1F",
  dropdownBg: "#1F1F1F",
  tabInactiveBg: "#1B1A1B",
  progressBg: "#262626",
  progressFilled: "#3AD04B",
  darkBgSecondary: "#2A2A2A",
  rememberMeFilled: "#00a908",

  inputDarkBorder: "#303030",

  primaryText: "#ffffff",
  textSecondary: "#6e6e6e",

  overlayDark: "rgba(0, 0, 0, 0.85)",
  overlayLightBorder: "rgba(255, 255, 255, 0.15)",
  overlayLightStrip: "rgba(255, 255, 255, 0.2)",
  chartRuleColor: "rgba(255, 255, 255, 0.08)",
  divider: "rgba(255, 255, 255, 0.05)",

  loginButtonBg: "#00a908",
  termsLink: "#05c80e",

  bubbleTextDark: "#1a1a1a",
  bubbleBg: "#fff",

  chartpointercolor: "#ffffff",

  fullscreenBg: "#000",
  controlButtonBg: "rgba(27, 26, 27, 0.9)",

  statusBarStyle: "light-content",
  navigationBg: "#FDFDFD",

  headerBg: "#1b1a1b",
  dateFilterBg: "#303030",
  dateFilterText: "#fff",
  tabActiveBg: "#3AD04B",
};

export const lightColors: ThemeColors = {
  splashBg: "#FFFFFF",
  inputDarkBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  metricCardBg: "#F0F0F0",
  dropdownBg: "#FFFFFF",
  tabInactiveBg: "#F0F0F0",
  progressBg: "#E4E4E7",
  progressFilled: "#3AD04B",
  darkBgSecondary: "#EBEBEB",
  rememberMeFilled: "#08820E",

  inputDarkBorder: "#CCCCCC",

  primaryText: "#000000",
  textSecondary: "#6E6E6E",

  overlayDark: "rgba(255, 255, 255, 0.95)",
  overlayLightBorder: "rgba(0, 0, 0, 0.1)",
  overlayLightStrip: "rgba(0, 0, 0, 0.1)",
  chartRuleColor: "rgba(0, 0, 0, 0.08)",
  divider: "rgba(0, 0, 0, 0.05)",

  loginButtonBg: "#08820E",
  termsLink: "#08820E",

  bubbleTextDark: "#1a1a1a",
  bubbleBg: "#EBEBEB",

  chartpointercolor: "#000000",

  fullscreenBg: "#FFFFFF",
  controlButtonBg: "rgba(235, 235, 235, 0.9)",

  statusBarStyle: "dark-content",
  navigationBg: "#FFFFFF",

  headerBg: "#E4E4E7",
  dateFilterBg: "#ffffff",
  dateFilterText: "#000000",
  tabActiveBg: "#08820E",
};
