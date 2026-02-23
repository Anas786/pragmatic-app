import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppText } from 'src/components/common';
import {
  BUBBLE_TEXT_DARK,
  CARD_BG,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  GRADIENT_GREEN,
  GRADIENT_RED,
  GRADIENT_YELLOW,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  TRANSPARENT,
  WHITE,
} from 'src/utils';

const TRIANGLE_SIZE = normalizeWidth(6);

interface GradientRangeBarProps {
  title: string;
  min: number;
  avg: number;
  max: number;
}

const ValueBubble: FC<{ value: string }> = ({ value }) => (
  <View style={styles.bubbleWrapper}>
    <View style={styles.valueBubble}>
      <AppText fontSize={FONT_SIZE_XXS} bold color={BUBBLE_TEXT_DARK}>
        {value}
      </AppText>
    </View>
    <View style={styles.bubbleTriangle} />
  </View>
);

const GradientRangeBar: FC<GradientRangeBarProps> = ({
  title,
  min,
  avg,
  max,
}) => {
  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
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
        <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
          Min
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
          Avg
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
          Max
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
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
    backgroundColor: WHITE,
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
    borderTopColor: WHITE,
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
