import React, { FC, useMemo, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { useScheme } from 'src/theme';
import { getInitials } from 'src/utils/format';
import AppText from '../AppText';
import PressableScale from '../PressableScale';

interface AvatarProps {
  name: string;
  /** Square size in pt (never width/height-normalised). Default 48. */
  size?: number;
  imageUrl?: string;
  onPress?: () => void;
  /** Defaults to the person's name. */
  accessibilityLabel?: string;
  /** @deprecated Ignored — the camera badge was removed with the image picker. */
  showCameraIcon?: boolean;
  /** @deprecated Ignored — there is no upload flow any more. */
  isLoading?: boolean;
}

const RING = 2;

/**
 * A person's avatar: an exact circle on a brandSoft fill with a 2pt brand
 * ring and brandText initials (round(0.38 × size), SemiBold), or the photo
 * inside the same ring. Sizes: 48 in the drawer row, 72 in the Profile
 * header. Decorative (hidden from screen readers) unless pressable or
 * given an explicit label — the name is normally printed beside it.
 */
const Avatar: FC<AvatarProps> = ({ name, size = 48, imageUrl, onPress, accessibilityLabel }) => {
  const scheme = useScheme();
  // Remember WHICH url failed (like SiteLogo), so a later, different url —
  // e.g. once the user record finishes loading — gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!imageUrl && failedUrl !== imageUrl;

  const circle = useMemo<ViewStyle>(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: RING,
      borderColor: scheme.brand,
      backgroundColor: scheme.brandSoft,
    }),
    [size, scheme.brand, scheme.brandSoft],
  );
  const inner = size - RING * 2;
  const imageStyle = useMemo(
    () => ({ width: inner, height: inner, borderRadius: inner / 2 }),
    [inner],
  );

  const body = (
    <View style={[styles.circle, circle]}>
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={imageStyle}
          resizeMode="cover"
          onError={() => setFailedUrl(imageUrl ?? null)}
        />
      ) : (
        <AppText
          semi_bold
          fontSize={Math.round(size * 0.38)}
          color={scheme.brandText}
          allowFontScaling={false}
          numberOfLines={1}>
          {getInitials(name)}
        </AppText>
      )}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? name}>
        {body}
      </PressableScale>
    );
  }
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {body}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default Avatar;
