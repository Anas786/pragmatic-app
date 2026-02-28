import React, { FC } from "react";
import { Image } from "react-native";
import { GifProps } from "src/types";

const EngineGif: FC<GifProps> = ({ size }) => {
  return (
    <Image
      style={{ width: size, height: size }}
      resizeMode="contain"
      source={require("./engine.gif")}
    />
  );
};

export default EngineGif;
