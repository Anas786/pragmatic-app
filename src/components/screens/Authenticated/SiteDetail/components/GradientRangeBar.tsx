import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  GRADIENT_GREEN,
  GRADIENT_RED,
  GRADIENT_YELLOW,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  TRANSPARENT,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';

const TRIANGLE_SIZE = normalizeWidth(6);

interface GradientRangeBarProps {
  title: string;
  min: number;
  avg: number;
  max: number;
}

const GradientRangeBar: FC<GradientRangeBarProps> = ({
  title,
  min,
  avg,
  max,
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ValueBubble: FC<{ value: string }> = ({ value }) => (
    <View style={styles.bubbleWrapper}>
      <View style={styles.valueBubble}>
        <AppText fontSize={FONT_SIZE_XXS} bold color={colors.bubbleTextDark}>
          {value}
        </AppText>
      </View>
      <View style={styles.bubbleTriangle} />
    </View>
  );

  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_XS} medium color={colors.primaryText}>
        {title}
      </AppText>

      <View style={styles.valuesRow}>
        <ValueBubble value={min.toFixed(2)} />
        <ValueBubble value={avg.toFixed(2)} />
        <ValueBubble value={max.toFixed(2)} />
      </View>

      <LinearGradient
        colors={[GRADIENT_RED, GRADIENT_YELLOW, GRADIENT_GREEN]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBar}
      />

      <View style={styles.labelsRow}>
        <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
          Min
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
          Avg
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
          Max
        </AppText>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(12),
      padding: normalizeWidth(14),
      gap: normalizeHeight(8),
    },
    valuesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: normalizeHeight(4),
    },
    bubbleWrapper: {
      alignItems: 'center',
    },
    valueBubble: {
      backgroundColor: colors.bubbleBg,
      paddingHorizontal: normalizeWidth(10),
      paddingVertical: normalizeHeight(4),
      borderRadius: 100,
      minWidth: normalizeWidth(48),
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleTriangle: {
      width: 0,
      height: 0,
      borderLeftWidth: TRIANGLE_SIZE,
      borderRightWidth: TRIANGLE_SIZE,
      borderTopWidth: TRIANGLE_SIZE,
      borderLeftColor: TRANSPARENT,
      borderRightColor: TRANSPARENT,
      borderTopColor: colors.bubbleBg,
    },
    gradientBar: {
      height: normalizeHeight(6),
      borderRadius: normalizeWidth(4),
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

export default GradientRangeBar;
