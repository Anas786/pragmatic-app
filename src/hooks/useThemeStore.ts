import { create } from 'zustand';
import { darkColors, lightColors, ThemeColors } from 'src/utils/theme/colors';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeStore = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: true,
      colors: darkColors,
      toggleTheme: () =>
        set((state) => {
          const nextIsDark = !state.isDark;
          return {
            isDark: nextIsDark,
            colors: nextIsDark ? darkColors : lightColors,
          };
        }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
);
