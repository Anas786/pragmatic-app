import React, { FC } from "react";
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  BLUE,
  getInitials,
  normalizeHeight,
  normalizeWidth,
  WHITE
} from "src/utils";
import AppText from "../AppText";

interface AvatarProps {
  name: string;
  size?: number;
  onPress?: () => void;
  showCameraIcon?: boolean;
  imageUrl?: string; // Optional profile image URL
  isLoading?: boolean; // Loading state for image upload
}

const Avatar: FC<AvatarProps> = ({ name, size = 48, onPress, showCameraIcon = false, imageUrl, isLoading = false }) => {
  const avatarSize = normalizeHeight(size);
  const iconSize = normalizeHeight(size * 0.3);

  return (
    <TouchableOpacity
      style={[
        styles.avatar,
        {
          height: avatarSize,
          width: normalizeWidth(size),
          borderRadius: avatarSize / 2,
        },
      ]}
      onPress={onPress}
      disabled={!onPress || isLoading}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHITE} />
        </View>
      ) : imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={[
            styles.avatarImage,
            {
              height: avatarSize,
              width: normalizeWidth(size),
              borderRadius: avatarSize / 2,
            }
          ]}
          resizeMode="cover"
        />
      ) : (
        <AppText semi_bold fontSize={20} color={WHITE}>
          {getInitials(name)}
        </AppText>
      )}
      
      {showCameraIcon && onPress && !isLoading && (
        <View style={[styles.cameraIconContainer, { bottom: -iconSize / 2, right: -iconSize / 2 }]}>
          <Icon name="camera-alt" size={iconSize} color={WHITE} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    // Image styles are applied inline for dynamic sizing
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconContainer: {
    position: "absolute",
    backgroundColor: BLUE,
    borderRadius: normalizeHeight(20),
    padding: normalizeHeight(4),
    borderWidth: 2,
    borderColor: WHITE,
  },
});

export default Avatar;
