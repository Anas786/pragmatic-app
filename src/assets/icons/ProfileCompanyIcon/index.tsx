import React, { FC } from "react";
import { G, Path, Rect, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const ProfileCompanyIcon: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        fill="none"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5">
        <Path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
          stroke={color}
        />
        <Rect width="6" color={color} height="4" x="9" y="3" rx="2" />
      </G>
    </Svg>
  );
};
export default ProfileCompanyIcon;
