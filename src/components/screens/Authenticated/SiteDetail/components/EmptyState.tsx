import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';

interface EmptyStateProps {
  title: string;
  description?: string;
}

const EmptyState: FC<EmptyStateProps> = ({
  title,
  description = 'This section is under development',
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_MD} medium color={colors.primaryText}>
        {title}
      </AppText>
      <AppText fontSize={FONT_SIZE_SM} color={colors.textSecondary}>
        {description}
      </AppText>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      padding: normalizeWidth(32),
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalizeHeight(8),
      minHeight: normalizeHeight(200),
    },
  });

export default EmptyState;
