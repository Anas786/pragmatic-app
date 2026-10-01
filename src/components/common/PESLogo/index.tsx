import React, { FC, memo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { brandMark, useScheme } from 'src/theme';
import { GLYPHS, VB_H, VB_W } from './glyphs';

export interface PESLogoProps {
  width: number;
  height: number;
  /**
   * Which background the mark sits on. 'auto' (default) follows the app
   * theme: white ink in dark mode, the brand's dark ink in light mode.
   * Force 'light' when the mark sits on a light tile regardless of theme.
   */
  tone?: 'auto' | 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

/**
 * The PES brand mark as vector art — the same glyph paths the cold-start
 * splash draws. Replaces the bundled logo.png where the logo sits directly
 * on the themed background: that PNG's ink is the brand's light-mode colour
 * and all but disappears on dark. Scales like `resizeMode="contain"`
 * (viewBox + default `xMidYMid meet`). Static — no animated SVG props.
 */
const PESLogo: FC<PESLogoProps> = ({ width, height, tone = 'auto', style }) => {
  const { isDark } = useScheme();
  const onDark = tone === 'auto' ? isDark : tone === 'dark';
  const ink = onDark ? brandMark.inkOnDark : brandMark.inkOnLight;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={style}
      accessibilityRole="image"
      accessibilityLabel="Pragmatic Engineering Solutions">
      <Defs>
        {/* objectBoundingBox (default): each bar gets its own gradient span. */}
        <LinearGradient id="pesBar" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={brandMark.barFrom} />
          <Stop offset="1" stopColor={brandMark.barTo} />
        </LinearGradient>
      </Defs>
      {GLYPHS.map(g => (
        <Path
          key={g.id}
          d={g.d}
          fillRule="evenodd"
          fill={g.kind === 'bar' ? 'url(#pesBar)' : ink}
        />
      ))}
    </Svg>
  );
};

export default memo(PESLogo);
