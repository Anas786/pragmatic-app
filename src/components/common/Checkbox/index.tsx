import React, { FC } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ALMOST_BLACK, BLACK, normalizeWidth } from "src/utils";
import AppText from "../AppText";
import CustomIcon from "../CustomIcon";
import Spacer from "../Spacer";

interface CheckboxProps {
  title: string;
  isChecked?: boolean;
  onPress: () => void;
}

const Checkbox: FC<CheckboxProps> = ({ title, isChecked, onPress }) => (
  <TouchableOpacity style={styles.container} onPress={onPress}>
    <View style={styles.checkbox}>
      {isChecked && <CustomIcon name="tick" size={18} color={BLACK} />}
    </View>
    <Spacer mh={4} />

    <AppText>{title}</AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: normalizeWidth(353),
  },
  checkbox: {
    width: normalizeWidth(18),
    height: normalizeWidth(18),
    borderRadius: 3,
    borderWidth: 2,
    borderColor: ALMOST_BLACK,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Checkbox;
