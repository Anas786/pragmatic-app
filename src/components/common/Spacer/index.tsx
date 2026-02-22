import React, { FC } from "react";
import { DimensionValue, View } from "react-native";
import { normalizeHeight } from "src/utils";

interface SpacerProps {
  mt?: DimensionValue;
  mb?: DimensionValue;
  mr?: DimensionValue;
  ml?: DimensionValue;
  mh?: DimensionValue;
  mv?: DimensionValue;
}

const Spacer: FC<SpacerProps> = ({ mt, mb, mr, ml, mh, mv }) => {
  return (
    <View
      style={{
        marginTop: mt ? normalizeHeight(mt as number) : undefined,
        marginBottom: mb ? normalizeHeight(mb as number) : undefined,
        marginRight: mr ? normalizeHeight(mr as number) : undefined,
        marginLeft: ml ? normalizeHeight(ml as number) : undefined,
        marginHorizontal: mh ? normalizeHeight(mh as number) : undefined,
        marginVertical: mv ? normalizeHeight(mv as number) : undefined,
      }}
    />
  );
};

export default Spacer;
