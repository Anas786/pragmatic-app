import React, { FC, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  display,
  extractCardConfigs,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  formatCardValue,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  resolveCardValue,
  resolveIcon,
  ThemeColors,
} from 'src/utils';
import { useSiteConfig, useSiteData, useThemeStore } from 'src/hooks';
import { DashboardStackParamList, ICardConfig } from 'src/types';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

interface PowerCardProps {
  card: ICardConfig;
  rawValue: unknown;
}

/**
 * Single card render. Accepts a normalized {@link ICardConfig} plus the
 * raw value already pulled from the live-data branch via
 * {@link resolveCardValue}. Keeping the resolution outside the row keeps
 * this component pure and trivially memoizable in a virtualized list
 * later if needed.
 */
const PowerCard: FC<PowerCardProps> = ({ card, rawValue }) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const Icon = resolveIcon(card.icon);
  const accent = card.colour ?? ACCENT_BLUE;
  const formatted = formatCardValue(rawValue, card.decimalPlaces);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.cardContent}>
        <AppText
          fontSize={FONT_SIZE_XXS}
          color={colors.textSecondary}
          numberOfLines={2}>
          {card.name}
        </AppText>
        <View style={styles.valueRow}>
          <AppText
            fontSize={FONT_SIZE_XS}
            semi_bold
            color={colors.primaryText}>
            {formatted}
          </AppText>
          {card.unit ? (
            <AppText fontSize={FONT_SIZE_XXS} color={colors.primaryText}>
              {' '}
              {card.unit}
            </AppText>
          ) : null}
        </View>
      </View>
      <Icon size={ICON_SIZE_LG} color={accent} />
    </View>
  );
};

const CardsView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  // Both queries are already cached after Dashboard's prefetch + the
  // top-level subscriptions in SiteDetail, so these are typically
  // synchronous reads from React Query's in-memory store.
  const { data: siteConfig } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);

  // Memoize the resolved (config × live) tuples so the cards array
  // reference is stable across unrelated re-renders. Re-derives only when
  // either response changes.
  const cards = useMemo(() => {
    const configs = extractCardConfigs(siteConfig);
    return configs.map(card => ({
      card,
      rawValue: resolveCardValue(card, liveData),
    }));
  }, [siteConfig, liveData]);

  /**
   * Dev-only diagnostic — dumps the entire `processed` branch of the
   * live-data response to Reactotron whenever it changes. Lets us verify
   * the exact shape and values the backend is sending so we can confirm
   * which `objKey` paths actually resolve under it.
   *
   * Wrapped in `__DEV__` so it never runs in release builds.
   */
  useEffect(() => {
    if (!__DEV__) return;
    if (!liveData) return;
    const processed = (liveData as unknown as Record<string, unknown>)
      .processed;
    display('liveData.processed', processed);
  }, [liveData]);

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
          <View style={styles.grid}>
            {cards.map(({ card, rawValue }, index) => (
              <View
                key={`${card.dataStore}:${card.objKey}:${index}`}
                style={styles.cardWrapper}>
                <PowerCard card={card} rawValue={rawValue} />
              </View>
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalizeWidth(10),
    },
    cardWrapper: {
      width: '48%',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      paddingVertical: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(12),
      gap: normalizeWidth(8),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(36),
      borderRadius: 2,
    },
    cardContent: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
  });

export default CardsView;
