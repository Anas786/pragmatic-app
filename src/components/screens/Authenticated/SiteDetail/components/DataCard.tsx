import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';

interface DataCardProps {
  label: string;
  /** Already-formatted display value (string), e.g. "1,005,727,768.96". */
  value: string;
  unit?: string;
  /** Accent bar colour on the leading edge of the card. Defaults to blue. */
  accentColor?: string;
  /** Pre-rendered icon node — usually an `<Image>` (GIF) or an SVG component. */
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
 *
 * - Accent bar uses `accentColor` (defaults to ACCENT_BLUE).
 * - Icon sits inside a 48×48 circle whose fill matches `cardBg` and which
 *   is outlined with `inputDarkBorder` so it stays visible in BOTH themes.
 * - Value is one-line with an `adjustsFontSizeToFit` safety net so long
 *   numbers (e.g. lifetime kWh totals) don't overflow.
 */
const DataCard: FC<DataCardProps> = ({
  label,
  value,
  unit,
  accentColor = ACCENT_BLUE,
  icon,
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardContent}>
        <AppText
          fontSize={FONT_SIZE_XXS}
          color={colors.textSecondary}
          numberOfLines={2}>
          {label}
        </AppText>
        <View style={styles.valueRow}>
          <AppText
            fontSize={FONT_SIZE_XS}
            semi_bold
            color={colors.primaryText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.valueText}>
            {value}
          </AppText>
          {unit ? (
            <AppText
              fontSize={FONT_SIZE_XXS}
              color={colors.primaryText}
              numberOfLines={1}>
              {' '}
              {unit}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.iconCircle}>{icon}</View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      paddingVertical: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(12),
      gap: normalizeWidth(12),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(36),
      borderRadius: 2,
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
    /**
     * Icon circle: theme-aware fill (`cardBg`) with a soft border, same
     * style as the Cards tab. Works as long as the icon node has a
     * transparent background (e.g. SVG, Lottie JSON). For opaque-bg
     * GIFs you'll see a visible square inside the circle in dark mode —
     * use Lottie JSON in that case.
     */
    iconCircle: {
      width: normalizeWidth(48),
      height: normalizeWidth(48),
      borderRadius: normalizeWidth(24),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  });

export default DataCard;
