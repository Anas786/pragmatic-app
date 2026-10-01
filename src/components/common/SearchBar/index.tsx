import React, {
  FC,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radius as radiusTokens, space, touch, useScheme } from 'src/theme';
import { ICON_SIZE_MD } from 'src/utils/theme';
import { Close, Magnify } from 'src/assets/icons';
import AppText from '../AppText';
import AppTextInput from '../AppTextInput';
import PressableScale from '../PressableScale';

export interface SearchBarHandle {
  /** Imperative reset — clears typed text and notifies parent with `''`. */
  clear: () => void;
}

interface SearchBarProps {
  /**
   * Fires only with the *debounced* (and `minChars`+-gated) value — i.e. the
   * value the parent should use to drive an API call. Does NOT fire on
   * every keystroke. This is critical: parent state changes during typing
   * cause re-renders, which can rebuild list headers, which makes FlatList
   * swap header elements, which unmounts the TextInput and drops the keyboard.
   *
   * The keyboard's Search key bypasses the gate: any non-empty value is
   * emitted immediately (so a 1-character query can still be run on purpose).
   */
  onDebouncedChange: (value: string) => void;
  /** Min chars before debounce fires. Below this we emit ''. Default 2. */
  minChars?: number;
  /** Debounce duration in ms. Default 350. */
  debounceMs?: number;
  /** Placeholder text. */
  placeholder?: string;
}

export const SEARCH_HELPER_TEXT = 'Keep typing to search';

const SEARCH_H = 48;
const CLEAR_SIZE = Math.max(44, touch.min);

interface SearchSurfaceProps {
  focused: boolean;
  children: React.ReactNode;
}

/** Pill outline: borderStrong (≥3:1) at rest, a 2pt brand ring on focus.
 *  Padding absorbs the extra 1pt so the content never shifts. */
const SearchSurface: FC<SearchSurfaceProps> = ({ focused, children }) => {
  const scheme = useScheme();
  const surfaceStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.searchSurface,
        focused ? styles.searchSurfaceFocused : null,
        {
          backgroundColor: scheme.surfaceMuted,
          borderColor: focused ? scheme.brand : scheme.borderStrong,
        },
      ]),
    [scheme.surfaceMuted, scheme.brand, scheme.borderStrong, focused],
  );
  return <View style={surfaceStyle}>{children}</View>;
};

/**
 * Self-contained search input.
 *
 *  - **Owns** typed value, focus state, and debounce timer internally.
 *  - **Emits** only the debounced value upward via `onDebouncedChange`.
 *  - Below `minChars` (but non-empty) shows an inline 'Keep typing to
 *    search' hint inside the pill — no layout shift under the field.
 *  - Exposes an imperative `clear()` for callers that need to reset the
 *    field (e.g. an empty-state CTA).
 */
const SearchBar = memo(
  forwardRef<SearchBarHandle, SearchBarProps>(
    (
      {
        onDebouncedChange,
        minChars = 2,
        debounceMs = 350,
        placeholder = 'Search',
      },
      ref,
    ) => {
      const scheme = useScheme();
      const [value, setValue] = useState('');
      const [focused, setFocused] = useState(false);
      // The short query the user explicitly ran with the Search key (it
      // silences the 'keep typing' hint while the text still matches).
      const [submitted, setSubmitted] = useState<string | null>(null);
      const lastEmitted = useRef('');

      const emit = useCallback(
        (next: string) => {
          if (lastEmitted.current !== next) {
            lastEmitted.current = next;
            onDebouncedChange(next);
          }
        },
        [onDebouncedChange],
      );

      useEffect(() => {
        const trimmed = value.trim();
        if (trimmed.length < minChars) {
          // A short query the user explicitly submitted stays in force
          // until the text changes away from it.
          if (trimmed.length > 0 && lastEmitted.current === trimmed) return;
          emit('');
          return;
        }
        const handle = setTimeout(() => emit(trimmed), debounceMs);
        return () => clearTimeout(handle);
      }, [value, minChars, debounceMs, emit]);

      const reset = useCallback(() => {
        setValue('');
        setSubmitted(null);
        emit('');
      }, [emit]);

      useImperativeHandle(ref, () => ({ clear: reset }), [reset]);

      const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          setSubmitted(trimmed);
          emit(trimmed);
        }
        Keyboard.dismiss();
      }, [value, emit]);

      const trimmedValue = value.trim();
      const showHelper =
        trimmedValue.length > 0 &&
        trimmedValue.length < minChars &&
        submitted !== trimmedValue;

      // iOS has no live regions — announce the hint once when it appears.
      useEffect(() => {
        if (showHelper && Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility(SEARCH_HELPER_TEXT);
        }
      }, [showHelper]);

      return (
        <SearchSurface focused={focused}>
          <Magnify
            size={ICON_SIZE_MD}
            color={focused ? scheme.brand : scheme.textSecondary}
          />
          <AppTextInput
            style={styles.searchInput}
            placeholder={placeholder}
            accessibilityLabel={placeholder}
            value={value}
            onChangeText={setValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
          {showHelper ? (
            <AppText
              variant="micro"
              tone="secondary"
              numberOfLines={1}
              accessibilityLiveRegion="polite"
              style={styles.helper}>
              {SEARCH_HELPER_TEXT}
            </AppText>
          ) : null}
          {value.length > 0 ? (
            <PressableScale
              onPress={reset}
              accessibilityLabel="Clear search"
              style={styles.clear}>
              <Close size={ICON_SIZE_MD} color={scheme.textSecondary} />
            </PressableScale>
          ) : null}
        </SearchSurface>
      );
    },
  ),
);
SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  searchSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
    minHeight: SEARCH_H,
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radiusTokens.pill,
  },
  searchSurfaceFocused: {
    borderWidth: 2,
    paddingLeft: space.lg - 1,
    paddingRight: space.xs - 1,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: space.sm,
  },
  helper: {
    flexShrink: 1,
  },
  clear: {
    width: CLEAR_SIZE,
    height: CLEAR_SIZE,
    // Real ≥touch.min box, but it never drives the pill's height (which
    // would grow 2pt on Android when the focus ring thickens).
    marginVertical: -space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;
