export interface ThemeColors {
  text: string;
  title: string;
  background: string;
  overlaybackground: string;
  inputborder: string;
  inputicon: string,
  bordercolor: string;
  buttonborder: string;
  iconbuttonbg: string;
  iconbuttonicon: string;
  iconbuttontext: string;
  buttonbg: string;
  buttontext: string,
  iconcolor: string;
  progressbarbg: string;
  progressbar: string;
  highlighted: string;
  highlightedsecondary: string;
  companyactiveborder: string;
  companyactivebg: string;
  companyinactivebg: string;
  activetintcolor: string;
  tabbariconactive: string;
  tabbariconinactive: string;
  tabbarprofileiconborder: string;
  iconsecondary: string;
  profilecardborder: string;
  profilecardheader: string;
  warningicon: string;
  warningbtnbg: string;
  warningbtnicon: string;
  warningbtntext: string;
  headerbackbuttonbg: string;
  headerstatus: string;
  headerstatusiconbg: string;
  headeractivestatusicon: string;
  headerinactivestatusicon: string;
}

export interface Theme {
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  colors: {
    text: '#6e6e6e',
    title: '#000000',
    background: '#ffffff',
    overlaybackground: '#ebebeb',
    inputborder: '#cccccc',
    inputicon: '#000000',
    bordercolor: '#e4e4e7',
    buttonborder: '#08820e',
    buttonbg: '#00a908',
    iconbuttonbg: '#08820e',
    iconbuttonicon: '#ffffff',
    iconbuttontext: '#ffffff',
    buttontext: '#ffffff',
    iconcolor: '#05c80e',
    progressbarbg: '#26262633',
    progressbar: '#08820e',
    highlighted: '#08820e',
    highlightedsecondary: '#08820e',
    companyactiveborder: '#ebebeb',
    companyactivebg: '#05c80e',
    companyinactivebg: '#6e6e6e',
    activetintcolor: '#cee8d7',
    tabbariconactive: '#08820e',
    tabbariconinactive: '#000000',
    tabbarprofileiconborder: '#000000',
    iconsecondary: '#000000',
    profilecardborder: '#000000',
    profilecardheader: '#ebebeb',
    warningicon: '#ab1e3e',
    warningbtnbg: '#ab1e3e',
    warningbtnicon: '#ffffff',
    warningbtntext: '#ffffff',
    headerbackbuttonbg: '#e4e4e7',
    headerstatus: '#e4e4e7',
    headerstatusiconbg: '#05c80e',
    headeractivestatusicon: '#3ad048',
    headerinactivestatusicon: '#000000',
  },
};

export const darkTheme: Theme = {
  colors: {
    text: '#6e6e6e',
    title: '#ffffff',
    background: '#000000',
    overlaybackground: '#1b1a1b',
    bordercolor: '#303030',
    inputborder: '#303030',
    inputicon: '#6f6f6f',
    buttonborder: '#e4e4e7',
    buttonbg: '#08820e',
    buttontext: '#ffffff',
    iconbuttonbg: '#08820e',
    iconbuttonicon: '#ffffff',
    iconbuttontext: '#ffffff',
    iconcolor: '#3ad04b',
    progressbarbg: '#262626',
    progressbar: '#3ad04b',
    highlighted: '#3ad04b',
    highlightedsecondary: '#08820e',
    companyactiveborder: '#1a1a1b',
    companyactivebg: '#3ad04b',
    companyinactivebg: '#6e6e6e',
    activetintcolor: '#232725',
    tabbariconactive: '#08820e',
    tabbariconinactive: '#ffffff',
    tabbarprofileiconborder: '#08820e',
    iconsecondary: '#ffffff',
    profilecardborder: '#ffffff',
    profilecardheader: '#171717',
    warningicon: '#ab1e3e',
    warningbtnbg: '#ab1e3e',
    warningbtnicon: '#ffffff',
    warningbtntext: '#ffffff',
    headerbackbuttonbg: '#0a0a0b',
    headerstatus: '#1b1a1b',
    headerstatusiconbg: '#05c80e',
    headeractivestatusicon: '#3ad048',
    headerinactivestatusicon: '#1b1a1b', 
  },
};