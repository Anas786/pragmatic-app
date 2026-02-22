import React, { FC } from "react";
import { View, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { BLACK, hexToRGB, WHITE } from "src/utils";

interface LoadingProps {
  visible: boolean;
}

const Loading: FC<LoadingProps> = ({ visible }) => {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color={WHITE} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: hexToRGB(BLACK, 0.4),
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Loading;
