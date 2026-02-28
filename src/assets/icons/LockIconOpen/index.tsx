import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const LockIconOpen: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 14V16M8.11972 5.02477C8.55509 3.28699 10.1272 2 12 2C14.2091 2 16 3.79086 16 6V9M7 21H17C18.1046 21 19 20.1046 19 19V11C19 9.89543 18.1046 9 17 9H7C5.89543 9 5 9.89543 5 11V19C5 20.1046 5.89543 21 7 21Z"
        stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      />
    </Svg>
  );
};

export default LockIconOpen;
