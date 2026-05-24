import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccentBar, AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  normalizeHeight,
  normalizeWidth,
} from 'src/utils';
import { radius as radiusTokens, space, useScheme } from 'src/theme';

interface DataCardProps {
  label: string;
  value: string;
  unit?: string;
  accentColor?: string;
  icon?: ReactNode;
}

/**
 * Shared single-row data card used by both Cards tab and Summary tab.
 *
 * Visual contract:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ ▌ <label>                                  ╭───╮         │
 *   │   <value> <unit>                           │ icon│        │
 *   │                                            ╰───╯         │
 *   └─────────────────────────────────────────────────────────┘
 */
const DataCard: FC<DataCardProps> = ({
  label,
  value,
  unit,
  accentColor = ACCENT_BLUE,
  icon,
}) => {
  const scheme = useScheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: scheme.surfaceRaised, borderColor: scheme.border },
      ]}>
      <AccentBar
        color={accentColor}
        width={normalizeWidth(3)}
        height={normalizeHeight(36)}
      />
      <View style={styles.cardContent}>
        <AppText
          fontSize={FONT_SIZE_XXS}
          color={scheme.textSecondary}
          numberOfLines={2}>
          {label}
        </AppText>
        <View style={styles.valueRow}>
          <AppText
            fontSize={FONT_SIZE_XS}
            semi_bold
            color={scheme.textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.valueText}>
            {value}
          </AppText>
          {unit ? (
            <AppText
              fontSize={FONT_SIZE_XXS}
              color={scheme.textPrimary}
              numberOfLines={1}>
              {' '}
              {unit}
            </AppText>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: scheme.surface, borderColor: scheme.border },
        ]}>
        {icon}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radiusTokens.md,
    paddingVertical: normalizeHeight(14),
    paddingHorizontal: space.md,
    gap: space.md,
  },
  cardContent: {
    flex: 1,
    gap: normalizeHeight(4),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  valueText: {
    flexShrink: 1,
  },
  iconCircle: {
    width: normalizeWidth(48),
    height: normalizeWidth(48),
    borderRadius: normalizeWidth(24),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default DataCard;
