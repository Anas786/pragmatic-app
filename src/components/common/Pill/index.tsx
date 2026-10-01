import React, {
  Children,
  createContext,
  FC,
  Fragment,
  isValidElement,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { haptics } from 'src/utils/haptics';
import AppText from '../AppText';
import PressableScale from '../PressableScale';

/* ─────────── position context (PillGroup → Pill) ─────────── */

type PillPosition = { index: number; total: number } | null;
const PillPositionContext = createContext<PillPosition>(null);

/* ─────────── Pill ─────────── */

export interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Visual height: 'sm' 32 / 'md' 36 (default). The touch target is
   *  topped up to `touch.min` with vertical hitSlop; the width is never
   *  below `touch.min` (short labels like '1' / 'All'). */
  size?: 'sm' | 'md';
  /** Optional count badge after the label ('Power 12'). */
  count?: number;
  /** Optional leading node (dot / icon). */
  leading?: ReactNode;
  disabled?: boolean;
  /** Screen-reader role (default 'radio' — one of a set). */
  role?: 'radio' | 'tab' | 'button';
  /** Defaults to the visible label (+ count). */
  accessibilityLabel?: string;
  testID?: string;
}

const PILL_HEIGHT = { sm: 32, md: touch.pillVisual } as const;

/**
 * The ONE selector chip for filters, sorts and categories.
 * Selected = brand fill + `textOnBrand` ink; unselected = surface + 1px
 * border + textPrimary. Fires the 'select' haptic only when the selection
 * actually changes (re-tapping the selected pill — e.g. to open its
 * picker — is silent). Wrap a set in `PillGroup` for radio-group
 * semantics and "n of m" position.
 */
const PillBase: FC<PillProps> = ({
  label,
  selected,
  onPress,
  size = 'md',
  count,
  leading,
  disabled = false,
  role = 'radio',
  accessibilityLabel,
  testID,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createPillStyles);
  const position = useContext(PillPositionContext);

  const height = PILL_HEIGHT[size];
  const slop = Math.max(0, Math.ceil((touch.min - height) / 2));
  const hitSlop = useMemo(() => ({ top: slop, bottom: slop, left: 0, right: 0 }), [slop]);

  const handlePress = useCallback(() => {
    if (!selected) haptics.select();
    onPress();
  }, [selected, onPress]);

  const style = useMemo(
    () => [
      styles.pill,
      { minHeight: height, paddingHorizontal: size === 'sm' ? space.md : space.lg },
      selected ? themed.selected : themed.unselected,
      disabled ? styles.disabled : null,
    ],
    [height, size, selected, themed.selected, themed.unselected, disabled],
  );

  const ink = selected ? scheme.textOnBrand : scheme.textPrimary;
  const a11yLabel =
    accessibilityLabel ?? (count !== undefined ? `${label}, ${count}` : label);
  // iOS has no native "n of m" for custom radios; Android TalkBack reads
  // the radio group itself, so position is only added on iOS.
  const a11yValue = useMemo(
    () =>
      Platform.OS === 'ios' && position
        ? { text: `${position.index + 1} of ${position.total}` }
        : undefined,
    [position],
  );

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      scaleTo={0.95}
      hitSlop={hitSlop}
      role={role}
      selected={selected}
      accessibilityLabel={a11yLabel}
      accessibilityValue={a11yValue}
      testID={testID}
      style={style}>
      {leading ?? null}
      <AppText variant="bodySm" medium color={ink} numberOfLines={1}>
        {label}
      </AppText>
      {count !== undefined ? (
        <View style={[styles.count, selected ? themed.countSelected : themed.countIdle]}>
          <AppText variant="caption" semi_bold color={ink}>
            {count}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
};
PillBase.displayName = 'Pill';

export const Pill = memo(PillBase);

/* ─────────── PillGroup ─────────── */

export interface PillGroupProps {
  /** Spoken name of the set, e.g. 'Report period'. */
  label: string;
  /** Horizontal scroller instead of a wrapping row. */
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Flatten fragments / arrays so position counts real pills. */
const flatten = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap(child =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );

/**
 * Container for a set of `Pill`s: radiogroup semantics + each pill's
 * position. Not itself focusable — the pills are.
 */
export const PillGroup: FC<PillGroupProps> = ({ label, scroll = false, style, children }) => {
  const items = flatten(children);
  const total = items.length;
  const content = items.map((child, index) => (
    <PillPositionContext.Provider
      key={isValidElement(child) && child.key != null ? child.key : index}
      value={{ index, total }}>
      {child}
    </PillPositionContext.Provider>
  ));

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={style}
        contentContainerStyle={styles.scrollRow}>
        {content}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.row, style]}>
      {content}
    </View>
  );
};
PillGroup.displayName = 'PillGroup';

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Horizontal half of the touch target: hitSlop is vertical only (a
    // horizontal slop would overlap the neighbouring pill in a row).
    minWidth: touch.min,
    gap: 6,
    borderRadius: radiusTokens.pill,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    // Room for the vertical hitSlop so it isn't clipped by the scroller.
    paddingVertical: Math.max(0, Math.ceil((touch.min - touch.pillVisual) / 2)),
  },
});

const createPillStyles = (scheme: Scheme) =>
  StyleSheet.create({
    selected: {
      backgroundColor: scheme.brand,
      borderColor: scheme.brand,
    },
    unselected: {
      backgroundColor: scheme.surface,
      borderColor: scheme.border,
    },
    // A deeper emerald well under the dark ink (≥5.3:1 in both themes).
    countSelected: {
      backgroundColor: scheme.brandBold,
    },
    countIdle: {
      backgroundColor: scheme.surfaceMuted,
    },
  });

export default Pill;
