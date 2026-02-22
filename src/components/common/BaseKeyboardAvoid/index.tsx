import React, { FC } from "react";
import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
} from "react-native";

const BaseKeyboardAvoid: FC<KeyboardAvoidingViewProps> = ({
  children,
  ...props
}) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    {...props}>
    {children}
  </KeyboardAvoidingView>
);
export default BaseKeyboardAvoid;
