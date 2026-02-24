import React, { FC } from "react";
import { View, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { useThemeStore } from "src/hooks/useThemeStore";
import { BLACK, hexToRGB, WHITE } from "src/utils";

interface LoadingProps {
  visible: boolean;
}

const Loading: FC<LoadingProps> = ({ visible }) => {
  const { isDark } = useThemeStore();

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color={isDark ? WHITE : BLACK} />
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
