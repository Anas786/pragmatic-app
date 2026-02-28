import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const Tick: FC<IconProps> = ({ size }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 10" fill="none">
      <Path
        d="M1.9707 5.12755L5.2252 8.38205L11.7457 1.87305"
        stroke={'#ffffff'}
        strokeOpacity="1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default Tick;
