import React, { FC } from "react";
import { DimensionValue, StyleSheet, View } from "react-native";
import { SECONDARY, WIDTH } from "src/utils";

interface DividerProps {
  width?: DimensionValue;
}

const Divider: FC<DividerProps> = ({ width = WIDTH }) => (
  <View style={[styles.divider, { width }]} />
);

const styles = StyleSheet.create({
  divider: {
    borderWidth: 1,
    borderColor: SECONDARY,
    alignSelf: "center",
  },
});

export default Divider;
