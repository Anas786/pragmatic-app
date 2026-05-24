/**
 * TrendView — v2 (modern hero + animated range cards).
 *
 * Composition:
 *   1. HeroGradientCard summary — LIVE chip, parameter count, date
 *      range. Sets the premium tone for the screen.
 *   2. One animated GradientRangeBar per tracked parameter, staggered
 *      on entrance so the section reveals as a single gesture.
 *   3. TrendAnalysisCard (multi-chart) below.
 */

import React, { FC, ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PulseDot,
} from 'src/components/common';
import {
  duration as durationTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  FONT_SIZE_LG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXL,
  FONT_SIZE_XXS,
  formatDateFilterLabel,
} from 'src/utils';
import GradientRangeBar from './GradientRangeBar';
import TrendAnalysisCard from './TrendAnalysisCard';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import { mockTrendsData } from 'src/data/mock';

const TrendView: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Lazy Date constructions so they only run on first render.
  const [startDate, setStartDate] = useState(() =>
    daysAgo(DEFAULT_CUSTOM_RANGE_DAYS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const paramCount = mockTrendsData.length;
  const aggregateAvg =
    paramCount > 0
      ? mockTrendsData.reduce((acc, t) => acc + t.avg, 0) / paramCount
      : 0;

  return (
    <Wrapper>
      <Animated.View
        entering={FadeInDown.duration(durationTokens.fast)
          .springify()
          .damping(20)}>
        <HeroGradientCard>
          <HeroTopRow>
            <HeroLiveBadge>
              <PulseDot color={scheme.heroOnGradient} size={8} />
              <OverlineLabel color={scheme.heroOnGradient}>
                LIVE · TRENDS
              </OverlineLabel>
            </HeroLiveBadge>
            <GlassChip>
              <AppText
                fontSize={FONT_SIZE_XXS}
                bold
                color={scheme.heroOnGradient}>
                Σ {paramCount}
              </AppText>
            </GlassChip>
          </HeroTopRow>

          <OverlineLabel
            color={scheme.heroOnGradientMuted}
            style={themed.heroSectionLabel}>
            PARAMETERS TRACKED
          </OverlineLabel>
          <HeroValueRow>
            <AppText
              fontSize={FONT_SIZE_XXL}
              bold
              color={scheme.heroOnGradient}
              numberOfLines={1}>
              {paramCount}
            </AppText>
            <AppText
              fontSize={FONT_SIZE_SM}
              color={scheme.heroOnGradientMuted}
              medium>
              params · avg {aggregateAvg.toFixed(0)}
            </AppText>
          </HeroValueRow>

          <View style={themed.heroFooter}>
            <OverlineLabel color={scheme.heroOnGradientMuted}>
              WINDOW
            </OverlineLabel>
            <AppText
              fontSize={FONT_SIZE_XS}
              semi_bold
              color={scheme.heroOnGradient}>
              {formatDateFilterLabel('Custom', startDate, endDate)}
            </AppText>
          </View>
        </HeroGradientCard>
      </Animated.View>

      <SectionBlock>
        <DateFilterHeader
          title="Chart Analysis"
          dateLabel={formatDateFilterLabel('Custom', startDate, endDate)}
          onDatePress={() => setShowDatePicker(true)}
          onRefresh={() => {}}
        />

        <Body>
          {mockTrendsData.map((trend, index) => (
            <GradientRangeBar
              key={trend.title}
              title={trend.title}
              min={trend.min}
              avg={trend.avg}
              max={trend.max}
              delay={140 + 80 * index}
            />
          ))}
        </Body>
      </SectionBlock>

      <TrendAnalysisCard />

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleDateApply}
      />
    </Wrapper>
  );
};
TrendView.displayName = 'TrendView';

/* ─────────────── styled wrappers ─────────────── */

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.wrapper}>{children}</View>;
};
Wrapper.displayName = 'Wrapper';

const SectionBlock: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.section}>{children}</View>;
};
SectionBlock.displayName = 'SectionBlock';

const Body: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.body}>{children}</View>;
};
Body.displayName = 'Body';

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    wrapper: {
      gap: space.lg,
    },
    section: {
      gap: space.md,
    },
    body: {
      gap: space.md,
    },
    heroSectionLabel: {
      marginTop: space.lg,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.lg,
      paddingTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: scheme.heroOnGradientMuted,
    },
  });

export default React.memo(TrendView);
