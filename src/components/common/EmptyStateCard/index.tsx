import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { FONT_SIZE_LG, FONT_SIZE_SM, FONT_SIZE_XS } from 'src/utils';
import AppText from '../AppText';
import PressableScale from '../PressableScale';
import Surface from '../Surface';

interface EmptyStateCardProps {
  title?: string;
  message?: ReactNode;
  icon?: ReactNode;
  padding?: 'lg' | 'xl' | '2xl' | '3xl';
  prominent?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
}

const EmptyStateCard: FC<EmptyStateCardProps> = ({
  title,
  message,
  icon,
  padding = '2xl',
  prominent = false,
  onRetry,
  retryLabel = 'Retry',
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space[padding]}
      style={themed.card}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      {title ? (
        <AppText
          fontSize={prominent ? FONT_SIZE_LG : FONT_SIZE_SM}
          bold={prominent}
          semi_bold={!prominent}
          color={scheme.textPrimary}
          center>
          {title}
        </AppText>
      ) : null}
      {typeof message === 'string' ? (
        <AppText fontSize={FONT_SIZE_SM} color={scheme.textSecondary} center>
          {message}
        </AppText>
      ) : (
        message
      )}
      {onRetry ? (
        <PressableScale onPress={onRetry} haptic="tap" style={themed.retry}>
          <AppText
            fontSize={FONT_SIZE_XS}
            semi_bold
            color={scheme.textOnBrand}>
            {retryLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  icon: {
    marginBottom: space.xs,
  },
});

const createStyles = (scheme: Scheme) => ({
  card: {
    alignItems: 'center' as const,
    gap: space.sm,
    borderWidth: 1,
    borderColor: scheme.border,
  },
  retry: {
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radiusTokens.pill,
    marginTop: space.sm,
    backgroundColor: scheme.brand,
  },
});

export default EmptyStateCard;
