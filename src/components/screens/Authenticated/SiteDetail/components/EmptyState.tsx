import React, { FC } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Surface } from 'src/components/common';
import { FONT_SIZE_MD, FONT_SIZE_SM } from 'src/utils';
import { space, useScheme } from 'src/theme';

interface EmptyStateProps {
  title: string;
  description?: string;
}

const EmptyState: FC<EmptyStateProps> = ({
  title,
  description = 'This section is under development',
}) => {
  const scheme = useScheme();

  return (
    <Surface
      elevation="sm"
      radius="xl"
      bordered
      background={scheme.surfaceMuted}
      padding={space['3xl']}
      style={styles.container}>
      <AppText fontSize={FONT_SIZE_MD} medium color={scheme.textPrimary}>
        {title}
      </AppText>
      <AppText fontSize={FONT_SIZE_SM} color={scheme.textSecondary}>
        {description}
      </AppText>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 200,
  },
});

export default EmptyState;
