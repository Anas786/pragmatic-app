import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
}

const EmptyState: FC<EmptyStateProps> = ({
  title,
  description = 'This section is under development',
}) => {
  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_MD} medium color={WHITE}>
        {title}
      </AppText>
      <AppText fontSize={FONT_SIZE_SM} color={TEXT_SECONDARY}>
        {description}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    padding: normalizeWidth(32),
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalizeHeight(8),
    minHeight: normalizeHeight(200),
  },
});

export default EmptyState;
