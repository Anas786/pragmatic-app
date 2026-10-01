import React, { FC, memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { radius as radiusTokens, useScheme } from 'src/theme';
import { getInitials } from 'src/utils/format';
import AppText from '../AppText';

interface SiteLogoProps {
  /** Logo URL (`buildSiteLogoUrl`), or null when the site has none. */
  uri?: string | null;
  /** Site name — initials fallback + default spoken label. */
  name: string;
  /** Square size in pt. 40 on Dashboard cards, 36 in the SiteDetail header. */
  size?: number;
  /** Defaults to '<name> logo'. */
  accessibilityLabel?: string;
}

const INSET = 4;

/**
 * A site's logo on a rounded-square plate. Logos are light-background
 * wordmark artwork, so they always sit on the `logoPlate` token (white /
 * light grey) — visible in both themes — and are drawn `contain` with a
 * 4pt inset so wide wordmarks are never cropped. No logo, or a failing
 * URL → the site's initials on a muted plate. No status ring: status is
 * shown only by the FreshnessStatus dot.
 */
const SiteLogo: FC<SiteLogoProps> = ({ uri, name, size = 40, accessibilityLabel }) => {
  const scheme = useScheme();
  // Remember WHICH url failed, so a new url automatically gets a fresh try.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = !!uri && failedUri !== uri;

  const plate = useMemo<ViewStyle>(
    () => ({
      width: size,
      height: size,
      borderRadius: radiusTokens.md,
      backgroundColor: showImage ? scheme.logoPlate : scheme.surfaceMuted,
      borderColor: scheme.border,
    }),
    [size, showImage, scheme.logoPlate, scheme.surfaceMuted, scheme.border],
  );
  const imageStyle = useMemo(
    () => ({ width: size - INSET * 2, height: size - INSET * 2 }),
    [size],
  );
  const source = useMemo(() => (uri ? { uri } : undefined), [uri]);

  return (
    <View
      style={[styles.plate, plate]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${name} logo`}>
      {showImage && source ? (
        <Image
          source={source}
          style={imageStyle}
          resizeMode="contain"
          onError={() => setFailedUri(uri ?? null)}
        />
      ) : (
        <AppText
          semi_bold
          fontSize={Math.round(size * 0.36)}
          color={scheme.brandText}
          allowFontScaling={false}
          numberOfLines={1}>
          {getInitials(name) || '?'}
        </AppText>
      )}
    </View>
  );
};
SiteLogo.displayName = 'SiteLogo';

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
});

export default memo(SiteLogo);
