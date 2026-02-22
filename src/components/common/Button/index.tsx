import React, { FC } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import {
  BLACK,
  normalizeHeight,
  normalizeWidth,
  PRIMARY,
  SECONDARY,
  WHITE
} from "src/utils";
import AppText from "../AppText";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  type?: "primary" | "secondary";
  loading?: boolean;
  width?: DimensionValue;
}

const Button: FC<ButtonProps> = ({
  title,
  type = "primary",
  loading = false,
  width = normalizeWidth(358),
  ...rest
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        type === "secondary" && styles.secondaryStyle,
        {
          width,
        },
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={type === "primary" ? WHITE : BLACK} />
      ) : (
        <AppText fontSize={16} bold>
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: normalizeWidth(358),
    justifyContent: "center",
    backgroundColor: PRIMARY,
    height: normalizeHeight(49),
    borderRadius: 15,
  },
  secondaryStyle: {
    backgroundColor: SECONDARY,
  },
});

export default Button;
