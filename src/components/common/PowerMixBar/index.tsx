import React, { FC, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { glass } from 'src/theme';

export interface PowerMixSegment {
  /** Stable React key — usually source name / id. */
  key: string;
  /** Segment fill color. */
  color: string;
  /**
   * Numeric weight for the flex layout. Larger weight ⇒ wider segment.
   * Tiny contributors (≈ 0) render as a 1px sliver via `minWeight`
   * so the user can still see "this source is present, just small".
   */
  weight: number;
}

interface PowerMixBarProps {
  segments: PowerMixSegment[];
  height?: number;
  radius?: number;
  trackColor?: string;
  minWeight?: number;
  gap?: number;
  style?: ViewStyle;
}

interface MixSegmentProps {
  color: string;
  flex: number;
  marginLeft: number;
}

const MixSegment: FC<MixSegmentProps> = ({ color, flex, marginLeft }) => {
  const segmentStyle = useMemo<ViewStyle>(
    () => ({ flex, backgroundColor: color, marginLeft }),
    [flex, color, marginLeft],
  );
  return <View style={segmentStyle} />;
};

/**
 * Segmented horizontal bar visualising a power/energy/severity mix.
 *
 * Reanimated note: segment weights are extracted to local variables
 * before being assigned so Reanimated's "shared value `.value` inside
 * inline style" heuristic doesn't trip on `segment.weight` lookups
 * (it does — even on plain JS objects).
 */
const PowerMixBar: FC<PowerMixBarProps> = ({
  segments,
  height = 10,
  radius,
  trackColor = glass.low,
  minWeight = 0,
  gap = 2,
  style,
}) => {
  const visible = segments.filter(s => s.weight + minWeight > 0);
  const r = radius ?? height / 2;
  const barStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        {
          flexDirection: 'row',
          overflow: 'hidden',
          height,
          borderRadius: r,
          backgroundColor: trackColor,
        } as ViewStyle,
        style,
      ]) as ViewStyle,
    [height, r, trackColor, style],
  );
  return (
    <View style={barStyle}>
      {visible.map((s, i) => (
        <MixSegment
          key={s.key}
          color={s.color}
          flex={Math.max(s.weight, minWeight)}
          marginLeft={i === 0 ? 0 : gap}
        />
      ))}
    </View>
  );
};

export default PowerMixBar;
