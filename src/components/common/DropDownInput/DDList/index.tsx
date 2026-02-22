import React, { FC } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Modal from "react-native-modal";
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
    container,
    innerContainer,
    headingContainer,
    headingText,
    listContainer,
    itemContainer,
    optionText,
  } = styles;

  const handleSelection = (option: any) => {
    onSelect(option);
    onHide();
  };

  return (
    <Modal isVisible={visible} style={{ margin: 0 }}>
      <TouchableWithoutFeedback onPress={onHide}>
        <View style={container}>
          <TouchableWithoutFeedback>
            <View style={innerContainer}>
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
                  ItemSeparatorComponent={() => <Divider width={"90%"} />}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
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
