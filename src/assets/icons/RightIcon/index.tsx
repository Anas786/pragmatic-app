import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const RightIcon: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6L15 12L9 18"
        stroke={color}
        stroke-width="1.99832"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
};

export default RightIcon;
