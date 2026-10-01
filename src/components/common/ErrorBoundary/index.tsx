import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Scheme, space, touch, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_SM, FONT_SIZE_XS, FONT_SIZE_XXS } from 'src/utils/theme';
import AppText from '../AppText';
import EmptyStateCard from '../EmptyStateCard';
import PressableScale from '../PressableScale';
import Surface from '../Surface';

interface Props {
  /** Optional human-readable label (dev fallback heading + logs). */
  label?: string;
  /**
   * Any value identifying "what is shown" (site id, tab key, filter…).
   * When it changes while the boundary is showing an error, the error is
   * cleared and the children re-render — a new site or tab gets a fresh
   * attempt instead of the previous crash card.
   */
  resetKey?: unknown;
  children?: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Catches render-time and lifecycle errors from any child subtree so a
 * single bad payload can't take the whole app down (on RN an uncaught
 * render error means a red-box / native abort).
 *
 * Release builds show a plain-language card — never the error name,
 * message or stack — with a 'Reload section' action. Dev builds keep the
 * diagnostic card (message + component stack).
 */
class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    if (__DEV__) {
      console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && !Object.is(prevProps.resetKey, this.props.resetKey)) {
      this.handleReset();
    }
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (this.state.error) {
      return __DEV__ ? (
        <DevFallback
          label={this.props.label}
          error={this.state.error}
          info={this.state.info}
          onReset={this.handleReset}
        />
      ) : (
        <EmptyStateCard
          kind="error"
          size="inline"
          title="This section couldn't be displayed"
          message="Something in this data couldn't be shown. Reload to try again."
          onRetry={this.handleReset}
          retryLabel="Reload section"
        />
      );
    }
    return this.props.children;
  }
}

interface FallbackProps {
  label?: string;
  error: Error;
  info: ErrorInfo | null;
  onReset: () => void;
}

/** __DEV__-only diagnostic card. */
const DevFallback = ({ label, error, info, onReset }: FallbackProps) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  return (
    <Surface
      elevation="sm"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      style={themed.card}>
      <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
        {label ? `${label} crashed` : 'Something went wrong'}
      </AppText>
      <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary}>
        {error.name}: {error.message}
      </AppText>
      {info?.componentStack ? (
        <ScrollView style={themed.stackBox} nestedScrollEnabled>
          <AppText
            fontSize={FONT_SIZE_XXS}
            color={scheme.textTertiary}
            style={styles.stackText}>
            {info.componentStack.trim()}
          </AppText>
        </ScrollView>
      ) : null}
      <PressableScale
        onPress={onReset}
        accessibilityLabel="Try again"
        style={themed.retryButton}>
        <AppText fontSize={FONT_SIZE_XS} semi_bold color={scheme.brandText}>
          Try again
        </AppText>
      </PressableScale>
    </Surface>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      gap: space.sm,
      borderWidth: 1,
      borderColor: scheme.border,
    },
    stackBox: {
      maxHeight: 200,
      backgroundColor: scheme.surfaceMuted,
      borderRadius: 8,
      padding: space.sm,
    },
    retryButton: {
      alignSelf: 'flex-start',
      minHeight: touch.min,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: 999,
      backgroundColor: scheme.brandSoft,
    },
  });

const styles = StyleSheet.create({
  stackText: {
    fontFamily: 'Courier',
  },
});

export default ErrorBoundaryInner;
export { ErrorBoundaryInner as ErrorBoundary };
