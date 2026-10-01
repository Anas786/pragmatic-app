import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  ColorScheme,
  radius as radiusTokens,
  Scheme,
  semantic,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { FONT_SIZE_LG, FONT_SIZE_SM, FONT_SIZE_XS } from 'src/utils/theme';
import AppText from '../AppText';
import IconWell from '../IconWell';
import PressableScale from '../PressableScale';
import Surface from '../Surface';

/** Which situation the card explains — picks a glyph + tone. */
export type EmptyStateKind = 'empty' | 'error' | 'offline' | 'noMatch' | 'notConfigured';

interface EmptyStateCardProps {
  /** Picks a MaterialIcons glyph in a tinted well. Ignored when `icon`
   *  is passed; omit both for a text-only card (previous behaviour). */
  kind?: EmptyStateKind;
  /** 'inline' (compact, inside a section, ≤ ~120pt) or 'section'. */
  size?: 'inline' | 'section';
  title?: string;
  message?: ReactNode;
  icon?: ReactNode;
  padding?: 'lg' | 'xl' | '2xl' | '3xl';
  prominent?: boolean;
  onRetry?: () => void;
  /** A verb: 'Retry', 'Clear search', 'Reload section'. */
  retryLabel?: string;
  testID?: string;
}

const GLYPH: Record<EmptyStateKind, string> = {
  empty: 'inbox',
  error: 'error-outline',
  offline: 'wifi-off',
  noMatch: 'search-off',
  notConfigured: 'account-tree',
};

/** Fill hue (6-digit hex, alpha-suffixed by IconWell) + glyph ink. */
const kindTone = (kind: EmptyStateKind, scheme: ColorScheme) => {
  switch (kind) {
    case 'error':
      return { fill: semantic.danger, ink: scheme.statusInk.danger };
    case 'offline':
      return { fill: semantic.warning, ink: scheme.statusInk.warning };
    default:
      // Neutral: textSecondary is a 6-digit hex in both schemes.
      return { fill: scheme.textSecondary, ink: scheme.textSecondary };
  }
};

/**
 * Empty / error / offline / no-match / not-configured state. Copy should
 * come from `friendlyError()` for errors: title = what happened,
 * message = what to do, retry label = a verb.
 */
const EmptyStateCard: FC<EmptyStateCardProps> = ({
  kind,
  size = 'section',
  title,
  message,
  icon,
  padding,
  prominent = false,
  onRetry,
  retryLabel = 'Retry',
  testID,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const inline = size === 'inline';
  const pad = space[padding ?? (inline ? 'lg' : '2xl')];

  let iconNode: ReactNode = icon ?? null;
  if (!iconNode && kind) {
    const tone = kindTone(kind, scheme);
    const well = inline ? 32 : 44;
    iconNode = (
      <IconWell color={tone.fill} size={well}>
        <Icon name={GLYPH[kind]} size={inline ? 18 : 24} color={tone.ink} />
      </IconWell>
    );
  }

  return (
    <Surface
      elevation={inline ? 'none' : 'md'}
      radius="xl"
      background={scheme.surface}
      padding={pad}
      testID={testID}
      style={[themed.card, inline ? styles.inline : null]}>
      {iconNode ? <View style={styles.icon}>{iconNode}</View> : null}
      {title ? (
        <AppText
          fontSize={prominent && !inline ? FONT_SIZE_LG : FONT_SIZE_SM}
          bold={prominent && !inline}
          semi_bold={!prominent || inline}
          color={scheme.textPrimary}
          accessibilityRole="header"
          center>
          {title}
        </AppText>
      ) : null}
      {typeof message === 'string' ? (
        <AppText
          fontSize={inline ? FONT_SIZE_XS : FONT_SIZE_SM}
          color={scheme.textSecondary}
          center>
          {message}
        </AppText>
      ) : (
        message
      )}
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          accessibilityLabel={retryLabel}
          style={themed.retry}>
          <AppText fontSize={FONT_SIZE_XS} semi_bold color={scheme.textOnBrand}>
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
  inline: {
    gap: space.xs,
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
    minHeight: touch.min,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radiusTokens.pill,
    marginTop: space.sm,
    backgroundColor: scheme.brand,
  },
});

export default EmptyStateCard;
