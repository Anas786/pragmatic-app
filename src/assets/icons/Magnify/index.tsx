import React, { FC } from "react";
import { Path, Svg } from "react-native-svg";
import { IconProps } from "src/types";

const Magnify: FC<IconProps> = ({ size }) => {
  return (
    <Svg width={size} height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.6001 20.4004L18.2002 16.0004C19.3002 14.4004 20 12.5004 20 10.4004C20 5.20042 15.7 0.900391 10.5 0.900391C5.3 0.900391 1 5.20042 1 10.4004C1 15.6004 5.3 19.9004 10.5 19.9004C12.6 19.9004 14.5001 19.2004 16.1001 18.1004L20.5 22.5004L22.6001 20.4004ZM4 10.5004C4 6.9004 6.9 4.0004 10.5 4.0004C14.1 4.0004 17 6.9004 17 10.5004C17 14.1004 14.1 17.0004 10.5 17.0004C6.9 17.0004 4 14.1004 4 10.5004Z"
        fill="#344054"
      />
    </Svg>
  );
};

export default Magnify;
