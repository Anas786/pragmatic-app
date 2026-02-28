import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const CalendarIcon: FC<IconProps> = ({ size, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 13" fill="none">
      <Path
        d="M4 1V2.5"
        stroke={color}
        stroke-width="0.75"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M8 1V2.5"
        stroke={color}
        stroke-width="0.75"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M1.75 4.54504H10.25"
        stroke={color}
        stroke-width="0.75"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M10.5 4.25V8.5C10.5 10 9.75 11 8 11H4C2.25 11 1.5 10 1.5 8.5V4.25C1.5 2.75 2.25 1.75 4 1.75H8C9.75 1.75 10.5 2.75 10.5 4.25Z"
        stroke={color}
        stroke-width="0.75"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M7.84735 6.84998H7.85184"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M7.84735 8.34998H7.85184"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M5.99774 6.84998H6.00223"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M5.99774 8.34998H6.00223"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M4.14716 6.84998H4.15165"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M4.14716 8.34998H4.15165"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
};

export default CalendarIcon;
