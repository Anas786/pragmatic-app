import React, { FC, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import {
  ALMOST_BLACK,
  BLUE,
  BORDER_GRAY,
  normalizeHeight,
  normalizeWidth,
  PLACEHOLDER_COLOR,
  RED,
  WHITE
} from "src/utils";
import AppText from "../AppText";
import CustomIcon from "../CustomIcon";
import Spacer from "../Spacer";
import DDList from "./DDList";

export interface DropDownInputProps {
  label: string;
  placeholder: string;
  onPress: (value: any) => void;
  selected?: string | number;
  list: Array<any>;
  error?: string;
  nameKey?: string;
  secondKey?: string;
  valueKey?: string;
  width?: number;
}

const DropDownInput: FC<DropDownInputProps> = ({
  label,
  placeholder,
  onPress,
  selected,
  list,
  error,
  nameKey,
  secondKey,
  valueKey,
  width,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  const toggleModal = (): void => {
    Keyboard.dismiss();
    setVisible(prev => !prev);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          width ? { width: normalizeWidth(width) } : {},
        ]}>
        {label && <AppText>{label}</AppText>}
        <Spacer mt={8} />
        <TouchableOpacity
          style={[
            styles.innerContainer,
            { borderColor: error ? RED : BORDER_GRAY },
          ]}
          onPress={toggleModal}>
          <AppText
            fontSize={16}
            color={selected ? ALMOST_BLACK : PLACEHOLDER_COLOR}>
            {selected || placeholder}
          </AppText>
          <CustomIcon name="down_arrow" color={BLUE} size={18} />
        </TouchableOpacity>
        {error && (
          <>
            <Spacer mv={2.5} />
            <AppText color={RED}>{error}</AppText>
          </>
        )}
      </View>

      <DDList
        visible={visible}
        onSelect={onPress}
        onHide={toggleModal}
        list={list}
        heading={label}
        nameKey={nameKey}
        secondKey={secondKey}
        valueKey={valueKey}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  innerContainer: {
    backgroundColor: WHITE,
    borderRadius: 5,
    borderWidth: 1,
    height: normalizeHeight(53.06),
    paddingHorizontal: 15,
    justifyContent: "space-between",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
});

export default DropDownInput;
