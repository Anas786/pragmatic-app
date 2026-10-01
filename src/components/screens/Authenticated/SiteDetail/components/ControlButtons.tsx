import React, { FC, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PressableScale } from 'src/components/common';
import { ICON_SIZE_MD, normalizeWidth } from 'src/utils';
import { radius as radiusTokens, Scheme, space, useScheme } from 'src/theme';
import type { SldViewMode } from 'src/hooks';
import { sldModeToggleMetrics, type SldOverlayBox } from './sldViewportFit';
import {
  FitOverviewIcon,
  LockIcon,
  LockIconOpen,
  Minus,
  NodeExpandIcon,
  Plus,
} from 'src/assets/icons';

interface ControlButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Toggle edge routing between curved bezier and straight orthogonal. */
  onToggleRouting: () => void;
  /** True when edges are in straight/orthogonal mode (highlights the button). */
  routingOrthogonal: boolean;
  onToggleLock: () => void;
  onFullscreen: () => void;
  isLocked: boolean;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  insetLeft?: number;
  insetBottom?: number;
}

// The accessible NAME is the visible label (WCAG 2.5.3 Label in Name — so
// Voice Control's "Tap Units" works); the explanation goes in the hint.
const GROUP_MODE_OPTIONS: ReadonlyArray<{
  mode: SldViewMode;
  label: string;
  hint: string;
}> = [
  { mode: 'grouped', label: 'Grouped', hint: 'Groups the diagram units by energy type' },
  { mode: 'units', label: 'Units', hint: 'Shows every unit individually' },
];

// Pill geometry — one source for its styles AND its fit footprint. The
// CONTAINER is ≥44pt tall because Fabric drops touches outside a parent's
// layout box, so slop past the pill would be dead (see sldModeToggleMetrics).
const TOGGLE = sldModeToggleMetrics(normalizeWidth, GROUP_MODE_OPTIONS.length);
// Vertical-only slop, exactly the container's padding + border: each
// segment's touch area spans the full ≥44pt pill height and stays inside
// the pill. No horizontal slop — the segments sit side by side (and each is
// already ≥44pt wide).
const SEGMENT_HIT_SLOP = { top: TOGGLE.slop, bottom: TOGGLE.slop, left: 0, right: 0 };

/**
 * Footprint of {@link SldModeToggle} for the viewport's fit math — the
 * pill's real layout box. It is anchored `edge` points inside the safe
 * area's top-right corner (same offset as the button column's bottom-left),
 * and the fitted diagram keeps `gap` clear of it.
 */
export const SLD_MODE_TOGGLE_BOX: SldOverlayBox = {
  width: TOGGLE.width,
  height: TOGGLE.height,
  edge: space.lg,
  gap: space.sm,
};

/** Translucent surface shared by the button column and the mode pill. */
const controlSurface = (scheme: Scheme) => ({
  backgroundColor: scheme.isDark
    ? 'rgba(17, 24, 39, 0.92)'
    : 'rgba(244, 245, 247, 0.92)',
  borderWidth: TOGGLE.border,
  borderColor: scheme.border,
});

const ControlButtons: FC<ControlButtonsProps> = ({
  onZoomIn,
  onZoomOut,
  onToggleRouting,
  routingOrthogonal,
  onToggleLock,
  onFullscreen,
  isLocked,
  currentZoom,
  minZoom,
  maxZoom,
  insetLeft = 0,
  insetBottom = 0,
}) => {
  const scheme = useScheme();
  const styles = useMemo(() => createStyles(scheme), [scheme]);
  // Lock only gates pan/pinch GESTURES (see SLDViewport) — the +/- buttons
  // stay live while locked, gated purely on the min/max zoom stops.
  const isZoomInDisabled = currentZoom >= maxZoom - 0.001;
  const isZoomOutDisabled = currentZoom <= minZoom + 0.001;
  const containerStyle = useMemo(
    () => [
      styles.container,
      { left: space.lg + insetLeft, bottom: space.lg + insetBottom },
    ],
    [styles.container, insetLeft, insetBottom],
  );

  return (
    <View style={containerStyle}>
      <PressableScale
        disabled={isZoomInDisabled}
        style={styles.button}
        onPress={onZoomIn}
        accessibilityLabel="Zoom in">
        <Plus
          size={ICON_SIZE_MD}
          color={isZoomInDisabled ? scheme.textSecondary : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        disabled={isZoomOutDisabled}
        style={styles.button}
        onPress={onZoomOut}
        accessibilityLabel="Zoom out">
        <Minus
          size={ICON_SIZE_MD}
          color={isZoomOutDisabled ? scheme.textSecondary : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onToggleRouting}
        accessibilityLabel={
          routingOrthogonal ? 'Use curved lines' : 'Use straight lines'
        }>
        <FitOverviewIcon
          size={ICON_SIZE_MD}
          color={routingOrthogonal ? scheme.brand : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onFullscreen}
        accessibilityLabel="Fullscreen">
        <NodeExpandIcon size={ICON_SIZE_MD} color={scheme.textPrimary} />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onToggleLock}
        accessibilityLabel={isLocked ? 'Unlock pan' : 'Lock pan'}>
        {isLocked ? (
          <LockIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
        ) : (
          <LockIconOpen size={ICON_SIZE_MD} color={scheme.textPrimary} />
        )}
      </PressableScale>
    </View>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: space.lg,
      left: space.lg,
      ...controlSurface(scheme),
      borderRadius: radiusTokens.md,
      padding: normalizeWidth(6),
      gap: normalizeWidth(2),
    },
    button: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.sm,
    },
  });

interface SldModeToggleProps {
  mode: SldViewMode;
  onChange: (mode: SldViewMode) => void;
}

/**
 * Grouped ⇄ Units segmented pill. Deliberately NOT part of the auto-fading
 * button column: the viewport renders it in its own always-visible,
 * always-tappable overlay so the Units view stays discoverable. Fixed
 * footprint — see {@link SLD_MODE_TOGGLE_BOX}.
 */
export const SldModeToggle: FC<SldModeToggleProps> = memo(({ mode, onChange }) => {
  const scheme = useScheme();
  const styles = useMemo(() => createToggleStyles(scheme), [scheme]);
  return (
    <View style={styles.segmented}>
      {GROUP_MODE_OPTIONS.map(opt => {
        const active = opt.mode === mode;
        return (
          <PressableScale
            key={opt.mode}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => {
              if (!active) onChange(opt.mode);
            }}
            haptic="select"
            selected={active}
            hitSlop={SEGMENT_HIT_SLOP}
            accessibilityLabel={opt.label}
            accessibilityHint={opt.hint}>
            <AppText
              fontSize={11}
              lineHeight={14}
              semi_bold={!active}
              bold={active}
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              color={active ? scheme.brand : scheme.textSecondary}>
              {opt.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
});
SldModeToggle.displayName = 'SldModeToggle';

const createToggleStyles = (scheme: Scheme) =>
  StyleSheet.create({
    segmented: {
      ...controlSurface(scheme),
      flexDirection: 'row',
      borderRadius: radiusTokens.pill,
      padding: TOGGLE.padding,
      gap: TOGGLE.gap,
    },
    segment: {
      width: TOGGLE.segmentWidth,
      height: TOGGLE.segmentHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
    },
    segmentActive: {
      backgroundColor: scheme.brandSoft,
    },
  });

export default ControlButtons;
