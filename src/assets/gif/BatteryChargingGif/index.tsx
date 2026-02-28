import React, { FC } from "react";
import { Image } from "react-native";
import { GifProps } from "src/types";

const BatteryChargingGif: FC<GifProps> = ({ size }) => {
  return (
    <Image
      style={{ width: size, height: size }}
      resizeMode="contain"
      source={require("./batterycharging.gif")}
    />
  );
};

export default BatteryChargingGif;
