import React, { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_XS,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TAB_ACTIVE_BG,
  TAB_INACTIVE_BG,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

export type TabOption = 'Summary' | 'Cards' | 'Alarms' | 'Trend';

interface TabSelectorProps {
  selected: TabOption;
  onSelect: (tab: TabOption) => void;
}

interface TabConfig {
  name: TabOption;
  icon: string;
}

const tabs: TabConfig[] = [
  { name: 'Summary', icon: '✨' },
  { name: 'Cards', icon: '📋' },
  { name: 'Alarms', icon: '🔔' },
  { name: 'Trend', icon: '📊' },
];

const TabSelector: FC<TabSelectorProps> = ({ selected, onSelect }) => {
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
            <AppText fontSize={FONT_SIZE_XS}>{tab.icon}</AppText>
            <AppText
              fontSize={FONT_SIZE_XS}
              medium
              color={isActive ? WHITE : TEXT_SECONDARY}>
              {tab.name}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: TAB_ACTIVE_BG,
    borderColor: TAB_ACTIVE_BG,
  },
  inactiveTab: {
    backgroundColor: TAB_INACTIVE_BG,
    borderColor: INPUT_DARK_BORDER,
  },
});

export default TabSelector;
