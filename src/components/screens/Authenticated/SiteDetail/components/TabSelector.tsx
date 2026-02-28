import React, { FC, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_XS,
  ICON_SIZE_SM,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  WHITE,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { IconProps } from 'src/types';
import { AlarmsTabIcon, CardsTabIcon, SummaryTabIcon, TrendTabIcon } from 'src/assets/icons';

export type TabOption = 'Summary' | 'Cards' | 'Alarms' | 'Trend';

interface TabSelectorProps {
  selected: TabOption;
  onSelect: (tab: TabOption) => void;
}

interface TabConfig {
  name: TabOption;
  iconName: FC<IconProps>;
}

interface TabIconProps {
  IconComponent: FC<{ size?: number; color?: string }>;
  size: number;
  color: string;
}

const TabIcons: FC<TabIconProps> = ({ IconComponent, size, color }) => {
  return <IconComponent size={size} color={color} />;
};

const tabs: TabConfig[] = [
  { name: 'Summary', iconName: SummaryTabIcon },
  { name: 'Cards', iconName: CardsTabIcon },
  { name: 'Alarms', iconName: AlarmsTabIcon },
  { name: 'Trend', iconName: TrendTabIcon },
];

const TabSelector: FC<TabSelectorProps> = ({ selected, onSelect }) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {tabs.map(tab => {
        const isActive = selected === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.tabButton,
              isActive ? styles.activeTab : styles.inactiveTab,
            ]}
            onPress={() => onSelect(tab.name)}>
            <TabIcons
              IconComponent={tab.iconName}
              size={ICON_SIZE_SM}
              color={isActive ? WHITE : colors.textSecondary}
            />
            <AppText
              fontSize={FONT_SIZE_XS}
              medium
              color={isActive ? WHITE : colors.textSecondary}>
              {tab.name}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: normalizeWidth(8),
      paddingVertical: normalizeHeight(4),
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(6),
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(10),
      borderRadius: 100,
      borderWidth: 1,
    },
    activeTab: {
      backgroundColor: colors.tabActiveBg,
      borderColor: colors.tabActiveBg,
    },
    inactiveTab: {
      backgroundColor: colors.tabInactiveBg,
      borderColor: colors.inputDarkBorder,
    },
  });

export default TabSelector;
