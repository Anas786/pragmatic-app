import React, { FC } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  BLUE,
  INPUT,
  normalizeHeight,
  normalizeWidth,
  RED,
  SECONDARY,
  WHITE,
} from "src/utils";
import AppText from "../AppText";
import CustomIcon, { IconName } from "../CustomIcon";
import Spacer from "../Spacer";

interface DetailSectionProps {
  title: string;
  items: {
    icon: IconName;
    name: string;
    onPress?: () => void;
    danger?: boolean;
    hideArrow?: boolean;
  }[];
}

const DetailSection: FC<DetailSectionProps> = ({ title, items }) => {
  return (
    <View>
      <AppText bold fontSize={16}>
        {title}
      </AppText>

      <Spacer mt={5} />

      <View style={styles.detailContainer}>
        {items.map((value, index) => {
          const showArrow = !value.hideArrow && !!value.onPress;
          return (
            <TouchableOpacity
              style={[
                styles.detailItem,
                index !== items.length - 1 && styles.bottomBorder,
              ]}
              key={index}
              onPress={value.onPress}>
              <View style={styles.row}>
                <CustomIcon name={value.icon} color={BLUE} />
                <Spacer mr={10} />
                <AppText medium color={value.danger ? RED : INPUT}>
                  {value.name}
                </AppText>
              </View>

              {showArrow && <CustomIcon name="right_icon" size={24} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailContainer: {
    width: normalizeWidth(353),
    borderWidth: 1,
    borderColor: SECONDARY,
    borderRadius: 10,
    backgroundColor: WHITE,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: normalizeHeight(10),
    paddingVertical: normalizeHeight(16),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SECONDARY,
  },
});

export default DetailSection;
