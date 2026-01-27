import { create } from 'zustand';
import { lightTheme, darkTheme, type Theme } from '../theme/color';
import { Appearance, Platform } from 'react-native';
import { MMKVLoader } from 'react-native-mmkv-storage';
import SystemNavigationBar from 'react-native-system-navigation-bar';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const storage = new MMKVLoader().initialize();
const STORAGE_KEY = 'theme';

const getSystemTheme = (): ThemeMode => Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

const resolveTheme = (mode: ThemeMode): Theme => mode === 'dark' ? darkTheme : lightTheme;

const updateNavBar = (mode: ThemeMode) => {
  if (Platform.OS !== 'android') return;
  const color = mode === 'dark' ? '#000000' : '#ffffff'; 
  const iconStyle = mode === 'dark' ? 'light' : 'dark'; 
  SystemNavigationBar.setNavigationColor(color, iconStyle);
};

const getInitialtheme = (): ThemeMode => {
  const storedMode = storage.getString(STORAGE_KEY) as ThemeMode | null;
  const finalMode = storedMode ? storedMode : getSystemTheme();
  updateNavBar(finalMode);
  return finalMode;
}

const initialtheme = getInitialtheme();

const Themestore = create<ThemeState>(set => ({
    mode: initialtheme,
    theme: resolveTheme(initialtheme),
    toggleTheme: () => {
        set((state)=>{
          const newtheme = state.mode === 'light' ? 'dark' : 'light';
          storage.setString(STORAGE_KEY, newtheme);
          updateNavBar(newtheme);
          return{
            mode: newtheme,
            theme: resolveTheme(newtheme),
          }
        });
    },
    setThemeMode: (mode: ThemeMode) => {
        storage.setString(STORAGE_KEY, mode);
        updateNavBar(mode);
        set({
            mode,
            theme: resolveTheme(mode),
        });
    }
}))

Appearance.addChangeListener(({ colorScheme }) => {
  const storedMode = storage.getString(STORAGE_KEY);
  if(!storedMode){
    const newsystemmode = colorScheme === 'dark' ? 'dark' : 'light';
    updateNavBar(newsystemmode);
    Themestore.setState({
      mode: newsystemmode,
      theme: resolveTheme(newsystemmode),
    }); 
  }
})


export default Themestore;
export type { ThemeState, ThemeMode };
