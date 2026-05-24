import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AccentBar,
  AppText,
  createBox,
  Dot,
  IconWell,
  PulseDot,
  Surface,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
} from 'src/utils';
import { AlarmCardData } from 'src/data/mock';
import { IconProps } from 'src/types';

const STAGGER_MS = 50;
const STAGGER_CAP = 6;
export const ANIM_LIMIT = 10;

/** Gradient direction constants for the row's tinted sweep. */
const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

export interface SeverityDef {
  key: 'priority' | 'major' | 'minor' | 'warning';
  label: string;
  color: string;
  rank: number;
}

const createRowStyles = (scheme: Scheme) =>
  StyleSheet.create({
    row: {
      borderColor: scheme.border,
    },
  });

const rowStaticStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  rowSolved: {
    opacity: 0.78,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
});

const Body = createBox(rowStaticStyles.body, 'Body');
const HeaderLine = createBox(rowStaticStyles.headerLine, 'HeaderLine');
const StatusCol = createBox(rowStaticStyles.statusCol, 'StatusCol');

export interface AlarmRowProps {
  data: AlarmCardData;
  severity: SeverityDef;
  index: number;
}

const AlarmRow: FC<AlarmRowProps> = ({ data, severity, index }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createRowStyles);
  const Icon = data.iconName as FC<IconProps>;
  const isSolved = data.status === 'Solved';
  const statusColor = isSolved ? scheme.brand : severity.color;

  const rowStyle = useMemo(
    () =>
      StyleSheet.flatten([
        rowStaticStyles.row,
        themed.row,
        isSolved ? rowStaticStyles.rowSolved : null,
      ]),
    [themed.row, isSolved],
  );

  const tile = (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      style={rowStyle}>
      {/* tinted gradient sweep — severity colour, very subtle */}
      <LinearGradient
        colors={[severity.color + '14', severity.color + '00']}
        start={GRADIENT_TL}
        end={GRADIENT_BR}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* severity accent bar */}
      <AccentBar color={severity.color} width={4} height={44} radius={2} />

      {/* icon well */}
      <IconWell color={severity.color} size={40}>
        <Icon size={ICON_SIZE_LG} color={severity.color} />
      </IconWell>

      {/* body */}
      <Body>
        <HeaderLine>
          <TintedPill color={severity.color} alpha="24" paddingY={3}>
            <AppText fontSize={FONT_SIZE_XXS} bold color={severity.color}>
              {data.priority.toUpperCase()}
            </AppText>
          </TintedPill>
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
            {data.time}
          </AppText>
        </HeaderLine>
        <AppText
          fontSize={FONT_SIZE_SM}
          semi_bold
          color={scheme.textPrimary}
          numberOfLines={2}>
          {data.title}
        </AppText>
      </Body>

      {/* status column */}
      <StatusCol>
        <TintedPill color={statusColor} alpha="1F" row paddingY={3}>
          {isSolved ? (
            <Dot color={statusColor} size={6} />
          ) : (
            // Pulsing dot for unsolved alarms — subtle motion that
            // signals "needs attention" without being visually noisy.
            <PulseDot color={statusColor} size={6} />
          )}
          <AppText
            fontSize={FONT_SIZE_XXS}
            semi_bold
            color={statusColor}>
            {data.status}
          </AppText>
        </TintedPill>
        <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
          {data.statusTime}
        </AppText>
      </StatusCol>
    </Surface>
  );

  // Cap stagger entrance animation to ANIM_LIMIT — Reanimated worklets
  // are cheap individually but compound at scale.
  if (index < ANIM_LIMIT) {
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.base)
          .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
          .springify()
          .damping(22)}>
        {tile}
      </Animated.View>
    );
  }
  return <View>{tile}</View>;
};

export default AlarmRow;
