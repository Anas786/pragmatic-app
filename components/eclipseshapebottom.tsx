import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface EclipseshapebottomProps extends ViewProps {
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

const Eclipseshapebottom: React.FC<EclipseshapebottomProps> = ({
  pointerEvents = 'none',
  style,
  ...props
}) => {
  const bottomeclipse = `<svg width="393" height="531" viewBox="0 0 393 531" fill="none" xmlns="http://www.w3.org/2000/svg">
<g opacity="0.1" filter="url(#filter0_f_2_166)">
<circle cx="429.5" cy="500.383" r="274.5" fill="#B1B1B1"/>
</g>
<defs>
<filter id="filter0_f_2_166" x="-70.8829" y="1.52588e-05" width="1000.77" height="1000.77" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="112.941" result="effect1_foregroundBlur_2_166"/>
</filter>
</defs>
</svg>
`;
  return (
    <View
      style={[styles.eclipsecontainer, style]}
      pointerEvents={pointerEvents}
      {...props}
    >
      <SvgXml xml={bottomeclipse} width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  eclipsecontainer: {
    position: 'absolute',
    width: 549,
    height: 549,
    bottom: 0,
  },
});

export default Eclipseshapebottom;
