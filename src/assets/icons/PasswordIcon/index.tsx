import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const PasswordIcon: FC<IconProps> = ({ size }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
    >
      <Path d="M7.5 5V7H12.5V5C12.5 3.61875 11.3812 2.5 10 2.5C8.61875 2.5 7.5 3.61875 7.5 5ZM6 7V5C6 2.79063 7.79063 1 10 1C12.2094 1 14 2.79063 14 5V7C15.1031 7 16 7.89687 16 9V16C16 17.1031 15.1031 18 14 18H6C4.89688 18 4 17.1031 4 16V9C4 7.89687 4.89688 7 6 7ZM12.5 8.5H7.5H6C5.725 8.5 5.5 8.725 5.5 9V16C5.5 16.275 5.725 16.5 6 16.5H14C14.275 16.5 14.5 16.275 14.5 16V9C14.5 8.725 14.275 8.5 14 8.5H12.5Z" fill="#6F6F6F"/>
    </Svg>
  );
};

export default PasswordIcon;