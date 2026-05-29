import React, { FC, useRef } from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import RNEChartsPro from 'react-native-echarts-pro';
import { AppText, PressableScale } from 'src/components/common';
import { radius as radiusTokens, space, useScheme } from 'src/theme';
import { FONT_SIZE_SM, FONT_SIZE_XS, FONT_SIZE_XXS } from 'src/utils';
import { ChartExportRef, exportChartImage } from './exportChart';

const PAD = 12;
const HEADER_H = 54;
// The container's LEFT edge maps to the physical portrait-top (the
// notch / Dynamic Island / camera) since the modal is portrait-locked.
// Inset that side so the left y-axis labels clear the cutout.
const NOTCH_INSET = 40;
// Smaller inset on the right so the right-hand y-axis labels don't clip.
const RIGHT_INSET = 20;

interface ChartFullscreenModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** A fully-built echarts option to render in landscape. */
  option: object;
  /** Optional caption under the title (e.g. a legend hint). */
  hint?: string;
}

/**
 * Generic full-screen LANDSCAPE viewer for any echarts (react-native-
 * echarts-pro) chart, with an Export-to-PNG action.
 *
 * No orientation library is installed, so rather than force a native
 * rotation we size a container to the screen's LONG edge and rotate it
 * 90° about its centre — it reads as landscape regardless of how the
 * phone is physically held, with no native deps / rebuild. The modal is
 * portrait-locked so the OS doesn't double-rotate.
 */
const ChartFullscreenModal: FC<ChartFullscreenModalProps> = ({
  visible,
  onClose,
  title,
  option,
  hint,
}) => {
  const scheme = useScheme();
  const { width: W, height: H } = useWindowDimensions();
  const chartRef = useRef<ChartExportRef | null>(null);

  // Landscape canvas = (long edge × short edge).
  const landscapeW = Math.max(W, H);
  const landscapeH = Math.min(W, H);

  const rotatedStyle = {
    position: 'absolute' as const,
    width: landscapeW,
    height: landscapeH,
    top: (H - landscapeH) / 2,
    left: (W - landscapeW) / 2,
    transform: [{ rotate: '90deg' }],
    backgroundColor: scheme.bg,
    paddingTop: PAD,
    paddingBottom: PAD,
    // Extra inset on the left (= portrait-top notch side) and a smaller
    // one on the right so neither y-axis clips.
    paddingRight: PAD + RIGHT_INSET,
    paddingLeft: PAD + NOTCH_INSET,
  };

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
      <View style={[styles.root, { backgroundColor: scheme.bg }]}>
        <View style={rotatedStyle}>
          <View
            style={[styles.header, { height: HEADER_H }]}
            pointerEvents="box-none">
            <View style={styles.titleBlock}>
              <AppText
                fontSize={FONT_SIZE_SM}
                bold
                center
                color={scheme.textPrimary}
                numberOfLines={1}>
                {title}
              </AppText>
              {hint ? (
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  center
                  color={scheme.textTertiary}
                  numberOfLines={1}>
                  {hint}
                </AppText>
              ) : null}
            </View>
            {/* Export + Close sit in the title row at the landscape
                top-right (the row's right end). */}
            <PressableScale
              onPress={() => exportChartImage(chartRef.current, title, scheme.bg)}
              haptic="tap"
              scaleTo={0.94}
              accessibilityLabel="Export chart as image"
              style={[styles.actionBtn, { backgroundColor: scheme.brandSoft }]}>
              <AppText fontSize={FONT_SIZE_XS} bold color={scheme.brand}>
                Export
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={onClose}
              haptic="tap"
              scaleTo={0.94}
              accessibilityLabel="Close full screen"
              style={[styles.actionBtn, { backgroundColor: scheme.brand }]}>
              <AppText fontSize={FONT_SIZE_XS} bold color={scheme.textOnBrand}>
                Close
              </AppText>
            </PressableScale>
          </View>

          {visible ? (
            <RNEChartsPro
              ref={chartRef as never}
              height={landscapeH - HEADER_H - PAD * 2}
              width={landscapeW - PAD * 2 - NOTCH_INSET - RIGHT_INSET}
              option={option}
              backgroundColor="transparent"
              enableParseStringFunction
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};
ChartFullscreenModal.displayName = 'ChartFullscreenModal';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    flexShrink: 0,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radiusTokens.pill,
  },
});

export default ChartFullscreenModal;
