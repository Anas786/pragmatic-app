import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';

interface HeroRowProps {
  children?: ReactNode;
}

/**
 * Shared layout primitives for the `HeroGradientCard` hero across redesigned
 * tabs (Summary / Cards / Alarms / Reports / Tables). These had identical
 * style definitions duplicated in each view file; consolidated here.
 *
 *  - `HeroTopRow`   — the top "LIVE · X" / right-side chip row.
 *  - `HeroLiveBadge`— the left "LIVE · X" cluster (PulseDot + overline).
 *  - `HeroValueRow` — the big-number row beneath the section label.
 */
export const HeroTopRow: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.heroTopRow}>{children}</View>
);
HeroTopRow.displayName = 'HeroTopRow';

export const HeroLiveBadge: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.liveBadge}>{children}</View>
);
HeroLiveBadge.displayName = 'HeroLiveBadge';

export const HeroValueRow: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.heroValueRow}>{children}</View>
);
HeroValueRow.displayName = 'HeroValueRow';

const styles = StyleSheet.create({
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginTop: 6,
    flexWrap: 'wrap',
  },
});

export default HeroTopRow;
