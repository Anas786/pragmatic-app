import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

/**
 * Corner "↳" arrow — used on the SLD controls to frame the whole diagram
 * (fit-to-overview), matching the web SLD.
 */
const FitOverviewIcon: FC<IconProps> = ({ size, color = "#374151" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 5 L9 15 L17 15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 12 L17 15 L14 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default FitOverviewIcon;
