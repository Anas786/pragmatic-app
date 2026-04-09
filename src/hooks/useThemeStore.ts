import { create } from "zustand";
import { darkColors, lightColors, ThemeColors } from "src/utils/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import { Appearance } from "react-native";

const THEME_KEY = "usertheme";

type ThemeStore = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    set => ({
      isDark: Appearance.getColorScheme() === "dark",
      colors: Appearance.getColorScheme() === "dark" ? darkColors : lightColors,

      toggleTheme: () =>
        set(state => {
          const nextIsDark = !state.isDark;
          AsyncStorage.setItem(THEME_KEY, nextIsDark ? "dark" : "light");
          return {
            isDark: nextIsDark,
            colors: nextIsDark ? darkColors : lightColors,
          };
        }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ isDark: state.isDark }),
    },
  ),
);

AsyncStorage.getItem(THEME_KEY).then(saved => {
  const isDark =
    saved !== null ? saved === "dark" : Appearance.getColorScheme() === "dark";
  useThemeStore.setState({ isDark, colors: isDark ? darkColors : lightColors });
});

Appearance.addChangeListener(({ colorScheme }) => {
  AsyncStorage.getItem(THEME_KEY).then(saved => {
    if (saved === null) {
      const isDark = colorScheme === "dark";
      useThemeStore.setState({
        isDark,
        colors: isDark ? darkColors : lightColors,
      });
    }
  });
});
