import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const Minus: FC<IconProps> = ({ size }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 2" fill="none">
      <Path
        d="M11.6848 1H1.31445"
        stroke="#344054"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default Minus;
