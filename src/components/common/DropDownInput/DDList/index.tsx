import React, { FC, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { duration as durationTokens } from "src/theme";
import { HEIGHT, WHITE, WIDTH } from "src/utils";
import { AppText, Divider } from "../..";

interface DDListProps {
  visible: boolean;
  onHide: () => void;
  list: Array<any>;
  onSelect: (option: Object) => void;
  heading: string;
  nameKey?: string;
  secondKey?: string;
  valueKey?: string;
}

const SCREEN_H = Dimensions.get("window").height;

const ListSeparator: FC = () => <Divider width={"90%"} />;

/**
 * Bottom-sheet dropdown list. Built on RN's **core** `Modal` + a
 * Reanimated slide/fade (NOT `react-native-modal`, which double-presents
 * under the New Architecture). Stays mounted through the exit animation
 * so the close still animates.
 */
const DDList: FC<DDListProps> = ({
  visible,
  onHide,
  list,
  onSelect,
  heading,
  nameKey,
  secondKey,
  valueKey,
}) => {
  const {
    innerContainer,
    headingContainer,
    headingText,
    listContainer,
    itemContainer,
    optionText,
  } = styles;

  // Keep the Modal mounted through the slide-out so the exit animates.
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: durationTokens.base });
    } else {
      progress.value = withTiming(
        0,
        { duration: durationTokens.base },
        finished => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
    // progress is a stable shared value; only react to `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (sheetH || SCREEN_H) }],
  }));

  const handleSelection = (option: any) => {
    onSelect(option);
    onHide();
  };

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onHide}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Close list">
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}
          />
        </Pressable>

        <Animated.View
          style={[innerContainer, sheetStyle]}
          onLayout={e => setSheetH(e.nativeEvent.layout.height)}>
          <View style={headingContainer}>
            <AppText style={headingText} fontSize={20} bold>
              {heading}
            </AppText>
          </View>
          <Divider width={"90%"} />
          <View style={listContainer}>
            <FlatList
              data={list}
              removeClippedSubviews={false}
              renderItem={({ item }) => (
                <Pressable
                  style={itemContainer}
                  onPress={() =>
                    handleSelection(valueKey ? item[valueKey] : item)
                  }>
                  <AppText style={optionText} fontSize={18}>
                    {nameKey
                      ? `${item[nameKey]}${
                          secondKey ? ` -- ${item[secondKey]}` : ""
                        }`
                      : item}
                  </AppText>
                </Pressable>
              )}
              ItemSeparatorComponent={ListSeparator}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  innerContainer: {
    backgroundColor: WHITE,
    width: WIDTH,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingBottom: 20,
  },
  headingContainer: {
    width: WIDTH * 0.9,
    alignSelf: "center",
  },
  headingText: {
    marginVertical: 20,
  },
  listContainer: {
    maxHeight: HEIGHT * 0.7,
  },
  itemContainer: {
    paddingVertical: 15,
  },
  optionText: {
    width: WIDTH * 0.85,
    alignSelf: "center",
  },
});

export default DDList;
