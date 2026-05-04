import React, { FC, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  extractCardConfigs,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  formatCardValue,
  normalizeHeight,
  normalizeWidth,
  resolveCardValue,
  ThemeColors,
} from 'src/utils';
import { resolveLottieIcon } from 'src/assets/gif';
import { useSiteConfig, useSiteData, useThemeStore } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import DataCard from './DataCard';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const CardsView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  // Both queries are cached after Dashboard's prefetch + the top-level
  // subscriptions in SiteDetail, so these are typically synchronous reads
  // from React Query's in-memory store.
  const { data: siteConfig } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);

  const cards = useMemo(() => {
    const configs = extractCardConfigs(siteConfig);
    return configs.map(card => {
      const rawValue = resolveCardValue(card, liveData);
      const lottie = resolveLottieIcon(card.icon);
      return {
        card,
        // Force 2 decimal places everywhere — keep display consistent
        // across Cards / Summary tabs even if the backend ships a
        // different `decimalPlaces` for individual cards.
        formatted: formatCardValue(rawValue, 2),
        lottie,
      };
    });
  }, [siteConfig, liveData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          Cards
        </AppText>
      </View>
      <View style={styles.body}>
        {cards.length === 0 ? (
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center>
            No cards configured for this site.
          </AppText>
        ) : (
          <View style={styles.list}>
            {cards.map(({ card, formatted, lottie }, index) => (
              <DataCard
                key={`${card.dataStore}:${card.objKey}:${index}`}
                label={card.name}
                value={formatted}
                unit={card.unit}
                accentColor={card.colour ?? ACCENT_BLUE}
                icon={
                  lottie ? (
                    <Image
                      source={lottie.path}
                      style={styles.iconImage}
                      resizeMode="contain"
                      accessibilityLabel={lottie.name}
                    />
                  ) : null
                }
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.inputDarkBg,
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
    },
    list: {
      gap: normalizeHeight(10),
    },
    iconImage: {
      width: normalizeWidth(32),
      height: normalizeWidth(32),
    },
  });

export default CardsView;
