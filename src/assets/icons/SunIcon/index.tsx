import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const SunIcon: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 20" fill="none">
      <Path
        d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5001M17.6859 17.69L18.5 18.5001M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
};

export default SunIcon;
