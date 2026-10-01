import React, { FC, useCallback, useMemo, useRef } from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import RNEChartsPro from 'react-native-echarts-pro';
import { AppText, PressableScale } from 'src/components/common';
import { radius as radiusTokens, space, touch, useScheme } from 'src/theme';
import { WEBVIEW_SETTINGS } from './chartConfig';
import { ChartExportRef, exportChartImage } from './exportChart';

/** Minimum breathing room on every edge of the landscape canvas. */
const PAD = 12;
/** Title row height — fits the ≥ touch.min action buttons. */
const HEADER_H = Math.max(54, touch.min + space.sm);

interface ChartFullscreenModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** A fully-built echarts option to render in landscape. */
  option: object;
  /** Optional caption under the title (e.g. a legend hint). */
  hint?: string;
  /**
   * Optional second caption line below `hint` — e.g. a data-quality
   * disclosure ("N invalid readings hidden"). Kept separate from `hint`
   * (rather than appended to it) so a data-quality note is never
   * truncated by the single-line legend hint sharing its space. Rendered
   * in the same muted style as `hint`; the TEXT itself carries the
   * meaning, not colour.
   */
  warning?: string;
  /**
   * Screen-reader summary of the chart's data. When given, the chart is
   * exposed as ONE image element with this label and the WebView's own
   * (meaningless) DOM is hidden from accessibility.
   */
  summary?: string;
}

/**
 * Generic full-screen LANDSCAPE viewer for any echarts (react-native-
 * echarts-pro) chart, with an Export-to-PNG action.
 *
 * No orientation library is installed and OS rotation is off-limits (crash
 * rules), so rather than rotate natively we size a container to the
 * screen's LONG edge and rotate it 90° (clockwise) about its centre — it
 * reads as landscape regardless of how the phone is held. The modal is
 * portrait-locked so the OS doesn't double-rotate.
 *
 * Safe area: after the clockwise quarter turn the content's LEFT edge lies
 * on the device's TOP (Dynamic Island / notch / punch-hole), its RIGHT on
 * the device's BOTTOM (home indicator / nav bar), its TOP on the device's
 * right and its BOTTOM on the device's left — so each content edge is
 * padded by the REAL inset of the device edge it sits on (never less than
 * PAD), instead of fixed guesses that clipped on the 17 Pro and wasted a
 * 40pt band on notch-less Androids. The insets are measured INSIDE the
 * modal (its own SafeAreaProvider): the app's root provider can't see the
 * modal window, which on Android draws under the status bar / cutout
 * (`statusBarTranslucent`) while the root view does not.
 */
const ChartFullscreenModal: FC<ChartFullscreenModalProps> = ({
  visible,
  onClose,
  ...body
}) => {
  const scheme = useScheme();
  const rootStyle = useMemo(
    () => [styles.root, { backgroundColor: scheme.bg }],
    [scheme.bg],
  );
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      // Lock to portrait — our manual 90° transform supplies the
      // landscape view, so the OS must NOT rotate too (double-rotation).
      supportedOrientations={['portrait']}
      onRequestClose={onClose}>
      <StatusBar hidden />
      <SafeAreaProvider style={rootStyle}>
        <FullscreenBody visible={visible} onClose={onClose} {...body} />
      </SafeAreaProvider>
    </Modal>
  );
};
ChartFullscreenModal.displayName = 'ChartFullscreenModal';

/** The rotated landscape canvas — reads the modal's own safe-area insets. */
const FullscreenBody: FC<ChartFullscreenModalProps> = ({
  visible,
  onClose,
  title,
  option,
  hint,
  warning,
  summary,
}) => {
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const chartRef = useRef<ChartExportRef | null>(null);

  // Landscape canvas = (long edge × short edge).
  const landscapeW = Math.max(W, H);
  const landscapeH = Math.min(W, H);

  const pad = useMemo(
    () => ({
      left: Math.max(PAD, insets.top),
      right: Math.max(PAD, insets.bottom),
      top: Math.max(PAD, insets.right),
      bottom: Math.max(PAD, insets.left),
    }),
    [insets.top, insets.bottom, insets.left, insets.right],
  );

  const rotatedStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: landscapeW,
      height: landscapeH,
      top: (H - landscapeH) / 2,
      left: (W - landscapeW) / 2,
      transform: [{ rotate: '90deg' }],
      backgroundColor: scheme.bg,
      paddingTop: pad.top,
      paddingBottom: pad.bottom,
      paddingLeft: pad.left,
      paddingRight: pad.right,
    }),
    [landscapeW, landscapeH, W, H, scheme.bg, pad],
  );
  const exportStyle = useMemo(
    () => [styles.actionBtn, { backgroundColor: scheme.brandSoft }],
    [scheme.brandSoft],
  );
  const closeStyle = useMemo(
    () => [styles.actionBtn, { backgroundColor: scheme.brand }],
    [scheme.brand],
  );

  const handleExport = useCallback(
    () => exportChartImage(chartRef.current, title, scheme.bg),
    [title, scheme.bg],
  );

  const chartW = landscapeW - pad.left - pad.right;
  const chartH = landscapeH - HEADER_H - pad.top - pad.bottom;

  const chart = visible ? (
    <RNEChartsPro
      ref={chartRef as never}
      height={chartH}
      width={chartW}
      option={option}
      backgroundColor="transparent"
      enableParseStringFunction
      webViewSettings={WEBVIEW_SETTINGS}
    />
  ) : null;

  return (
    <View style={rotatedStyle}>
      <View style={styles.header} pointerEvents="box-none">
        <View style={styles.titleBlock}>
          <AppText
            variant="bodySm"
            semi_bold
            center
            accessibilityRole="header"
            numberOfLines={1}>
            {title}
          </AppText>
          {hint ? (
            <AppText variant="caption" tone="secondary" center numberOfLines={1}>
              {hint}
            </AppText>
          ) : null}
          {warning ? (
            <AppText variant="caption" tone="secondary" center numberOfLines={1}>
              {warning}
            </AppText>
          ) : null}
        </View>
        {/* Export + Close sit in the title row at the landscape
            top-right (the row's right end). Both ≥ touch.min tall. */}
        <PressableScale
          onPress={handleExport}
          scaleTo={0.94}
          accessibilityLabel="Export chart as image"
          style={exportStyle}>
          <Icon name="ios-share" size={16} color={scheme.brandText} />
          <AppText variant="bodySm" semi_bold tone="brand">
            Export
          </AppText>
        </PressableScale>
        <PressableScale
          onPress={onClose}
          scaleTo={0.94}
          accessibilityLabel="Close full screen"
          style={closeStyle}>
          <Icon name="close" size={16} color={scheme.textOnBrand} />
          <AppText variant="bodySm" semi_bold tone="onBrand">
            Close
          </AppText>
        </PressableScale>
      </View>

      {summary ? (
        <View
          style={styles.chartFill}
          accessible
          accessibilityRole="image"
          accessibilityLabel={summary}>
          <View
            style={styles.chartFill}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden>
            {chart}
          </View>
        </View>
      ) : (
        chart
      )}
    </View>
  );
};
FullscreenBody.displayName = 'ChartFullscreenBody';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  // The library's chart root is `flex: 1` — wrappers must fill the
  // remaining canvas or it collapses to 0 height.
  chartFill: {
    flex: 1,
  },
  actionBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: space.lg,
    borderRadius: radiusTokens.pill,
  },
});

export default ChartFullscreenModal;
