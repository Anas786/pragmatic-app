import React, { FC } from "react";
import { ScrollView, ScrollViewProps, StyleSheet } from "react-native";

const ScrollContainer: FC<ScrollViewProps> = ({
  children,
  contentContainerStyle,
  ...rest
}) => {
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      {...rest}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignSelf: "center",
  },
});

export default ScrollContainer;
