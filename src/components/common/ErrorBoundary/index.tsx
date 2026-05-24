import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, PressableScale, Surface } from 'src/components/common';
import { Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_SM, FONT_SIZE_XS, FONT_SIZE_XXS } from 'src/utils';

interface Props {
  /** Optional human-readable label shown above the error message. */
  label?: string;
  children?: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Catches render-time and lifecycle errors from any child subtree and
 * shows the message + stack instead of letting them propagate up (which
 * on RN typically means a JS-thread crash and a red-box / native abort).
 *
 * Wrap individual screens that are prone to data-shape surprises so a
 * single bad payload doesn't take the whole app down.
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
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorBoundaryFallback
          label={this.props.label}
          error={this.state.error}
          info={this.state.info}
          onReset={this.handleReset}
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

const ErrorBoundaryFallback = ({ label, error, info, onReset }: FallbackProps) => {
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
      <PressableScale onPress={onReset} haptic="tap" style={themed.retryButton}>
        <AppText fontSize={FONT_SIZE_XS} semi_bold color={scheme.brand}>
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
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
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
