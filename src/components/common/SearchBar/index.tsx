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
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { radius as radiusTokens, space, useScheme } from 'src/theme';
import { ICON_SIZE_MD } from 'src/utils';
import { Close, Magnify } from 'src/assets/icons';
import AppTextInput from '../AppTextInput';

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
   */
  onDebouncedChange: (value: string) => void;
  /** Min chars before debounce fires. Below this we emit ''. Default 4. */
  minChars?: number;
  /** Debounce duration in ms. Default 350. */
  debounceMs?: number;
  /** Placeholder text. */
  placeholder?: string;
}

interface SearchSurfaceProps {
  focused: boolean;
  children: React.ReactNode;
}

const SearchSurface: FC<SearchSurfaceProps> = ({ focused, children }) => {
  const scheme = useScheme();
  const surfaceStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.searchSurface,
        {
          backgroundColor: scheme.surfaceMuted,
          borderColor: focused ? scheme.brand : scheme.border,
        },
      ]),
    [scheme.surfaceMuted, scheme.brand, scheme.border, focused],
  );
  return <View style={surfaceStyle}>{children}</View>;
};

/**
 * Self-contained search input.
 *
 *  - **Owns** typed value, focus state, and debounce timer internally.
 *  - **Emits** only the debounced value upward via `onDebouncedChange`.
 *  - Exposes an imperative `clear()` for callers that need to reset the
 *    field (e.g. an empty-state CTA).
 */
const SearchBar = memo(
  forwardRef<SearchBarHandle, SearchBarProps>(
    (
      {
        onDebouncedChange,
        minChars = 4,
        debounceMs = 350,
        placeholder = 'Search',
      },
      ref,
    ) => {
      const scheme = useScheme();
      const [value, setValue] = useState('');
      const [focused, setFocused] = useState(false);
      const lastEmitted = useRef('');

      useEffect(() => {
        const trimmed = value.trim();
        if (trimmed.length < minChars) {
          if (lastEmitted.current !== '') {
            lastEmitted.current = '';
            onDebouncedChange('');
          }
          return;
        }
        const handle = setTimeout(() => {
          if (lastEmitted.current !== trimmed) {
            lastEmitted.current = trimmed;
            onDebouncedChange(trimmed);
          }
        }, debounceMs);
        return () => clearTimeout(handle);
      }, [value, minChars, debounceMs, onDebouncedChange]);

      useImperativeHandle(
        ref,
        () => ({
          clear: () => {
            setValue('');
            if (lastEmitted.current !== '') {
              lastEmitted.current = '';
              onDebouncedChange('');
            }
          },
        }),
        [onDebouncedChange],
      );

      const handleClearTap = useCallback(() => {
        setValue('');
        if (lastEmitted.current !== '') {
          lastEmitted.current = '';
          onDebouncedChange('');
        }
      }, [onDebouncedChange]);

      return (
        <SearchSurface focused={focused}>
          <Magnify
            size={ICON_SIZE_MD}
            color={focused ? scheme.brand : scheme.textTertiary}
          />
          <AppTextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={value}
            onChangeText={setValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
          {value.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearTap}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <Close size={ICON_SIZE_MD} color={scheme.textSecondary} />
            </TouchableOpacity>
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
    paddingHorizontal: space.lg,
    height: 48,
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radiusTokens.pill,
  },
  searchInput: {
    flex: 1,
  },
});

export default SearchBar;
