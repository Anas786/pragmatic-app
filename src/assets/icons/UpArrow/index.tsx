import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const UpArrow: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 15L12 9L18 15" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      />
    </Svg>
  );
};

export default UpArrow;
