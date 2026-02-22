import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const DownArrow: FC<IconProps> = ({ size, color = "#1EC2F3" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 9" fill="none">
      <Path
        d="M13.0684 1.53125L7.06836 7.53125L1.06836 1.53125"
        stroke={color}
        strokeWidth="1.99832"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default DownArrow;
