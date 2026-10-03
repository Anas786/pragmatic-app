import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
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
import { display } from 'src/utils/logger';
import { WEBVIEW_SETTINGS } from './chartConfig';
import { ChartExportRef, exportChartImage } from './exportChart';

/** Minimum breathing room on every edge of the landscape canvas. */
const PAD = 12;

/**
 * First-paint watchdog: when the chart hasn't reported its first finished
 * render (echarts' `finished` event) this long after its WebView mounted,
 * the WebView is remounted ONCE. Seen once on an Android emulator (root
 * cause unproven): the WebView was laid out at full size, the app and the
 * renderer sat idle, and it never drew; closing + reopening drew normally.
 * Far above a real first paint (well under a second on a phone; 15–37 s on
 * a software-GL emulator with the intro animation).
 */
export const FULLSCREEN_CHART_PAINT_TIMEOUT_MS = 45_000;

/** Minimum title-row height — fits the ≥ touch.min action buttons. The
 *  row grows past it when the captions wrap (large text, a long note). */
const HEADER_MIN_H = Math.max(54, touch.min + space.sm);

interface ChartFullscreenModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** A fully-built echarts option to render in landscape. */
  option: object;
  /** Optional caption under the title (e.g. a legend hint). */
  hint?: string;
  /**
   * Optional caption below `hint` — e.g. a data-quality note ("2 readings
   * look invalid — shown exactly as sent by the device"). Kept separate
   * from `hint` (rather than appended to it) so a data-quality note is
   * never truncated by the single-line legend hint sharing its space. It
   * wraps onto a second line (and shrinks only past that) — the header
   * grows to fit and the chart takes the rest. Rendered in the same muted
   * style as `hint`; the TEXT itself carries the meaning, not colour.
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
  // The header's real height (it grows when captions wrap). The chart
  // mounts only once it is known: the injected JS sizes the echarts
  // container ONCE at load, so a WebView must never be resized under it.
  const [headerH, setHeaderH] = useState<number | null>(null);
  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setHeaderH(prev => (prev === h ? prev : h));
  }, []);

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
  const chartH = landscapeH - (headerH ?? HEADER_MIN_H) - pad.top - pad.bottom;
  const chartMounted = visible && headerH !== null;

  /* ── first-paint probe + one-shot remount (FULLSCREEN_CHART_PAINT_TIMEOUT_MS).
     `firstPaint` is per WebView mount; the event map is built once, so the
     library's injected script (which lists the subscribed events) never
     changes because of it. ── */
  const [remounts, setRemounts] = useState(0);
  const firstPaint = useRef({ since: 0, done: false });
  const titleRef = useRef(title);
  titleRef.current = title;
  const remountsRef = useRef(remounts);
  remountsRef.current = remounts;
  const eventActions = useMemo(
    () => ({
      finished: () => {
        if (firstPaint.current.done) return;
        firstPaint.current.done = true;
        display('chart fullscreen paint', {
          title: titleRef.current,
          ms: Date.now() - firstPaint.current.since,
          remounts: remountsRef.current,
        });
      },
    }),
    [],
  );
  useEffect(() => {
    if (!chartMounted) return undefined;
    firstPaint.current = { since: Date.now(), done: false };
    if (remounts > 0) return undefined; // remount once, never loop
    const id = setTimeout(() => {
      if (firstPaint.current.done) return;
      display(
        'chart fullscreen paint stalled — remounting the WebView',
        { title: titleRef.current, waitedMs: FULLSCREEN_CHART_PAINT_TIMEOUT_MS },
        undefined,
        true,
      );
      setRemounts(1);
    }, FULLSCREEN_CHART_PAINT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [chartMounted, chartH, remounts]);

  const chart = chartMounted ? (
    <RNEChartsPro
      // A new height needs a fresh WebView (see `headerH`); only happens
      // if the header re-wraps while open (e.g. a longer note). `remounts`
      // is the first-paint watchdog's one retry.
      key={`${chartH}:${remounts}`}
      ref={chartRef as never}
      height={chartH}
      width={chartW}
      option={option}
      backgroundColor="transparent"
      enableParseStringFunction
      eventActions={eventActions}
      webViewSettings={WEBVIEW_SETTINGS}
    />
  ) : null;

  return (
    <View style={rotatedStyle}>
      <View style={styles.header} pointerEvents="box-none" onLayout={onHeaderLayout}>
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
            // Wraps to a second line (the header grows to fit), then
            // shrinks: a data-quality note must be read in full.
            <AppText
              variant="caption"
              tone="secondary"
              center
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
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
    minHeight: HEADER_MIN_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
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
