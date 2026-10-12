import React, { FC, memo, ReactElement, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppText, IconButton, PressableScale, Skeleton } from 'src/components/common';
import { DEFAULT_MAX_FONT_SCALE, MIN_FONT_SIZE } from 'src/components/common/AppText';
import { ICON_SIZE_MD, normalizeFont, normalizeWidth } from 'src/utils';
import { estimateSldTextWidth } from 'src/utils/sldPhoneLayout';
import { radius as radiusTokens, Scheme, space, touch, useScheme } from 'src/theme';
import type { SldView, SldViewMode } from 'src/hooks';
import {
  sldControlColumnLayout,
  sldControlColumnMetrics,
  sldHeaderPillMetrics,
  sldModeToggleMetrics,
  sldRailLabelFit,
  sldRailMetrics,
  sldRailSegmentInner,
  sldViewHeaderLayout,
  type SldModeToggleMetrics,
  type SldOverlayBox,
  type SldRect,
} from './sldViewportFit';
import {
  Close,
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
  /** Pause / Play the diagram's flow animation (WCAG 2.2.2). */
  motionPaused: boolean;
  onToggleMotion: () => void;
  /**
   * Set when nothing moves for a reason OTHER than the user's Pause (Reduce
   * Motion, data not live — `sldMotionOff().spoken`): the Pause / Play
   * button becomes a disabled "animation off" STATE with this as its
   * spoken label, instead of an action that does nothing.
   */
  motionOffLabel?: string | null;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  insetLeft?: number;
  insetBottom?: number;
  /**
   * The tallest the controls may be (`sldControlColumnMaxHeight`: up to the
   * top-left pill's keep-out). Past it the buttons wrap into a second
   * column instead of growing under the pill. Omitted = unbounded.
   */
  maxHeight?: number;
}

// The accessible NAME is the visible label (WCAG 2.5.3 Label in Name — so
// Voice Control's "Tap Units" works); the explanation goes in the hint.
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint: string;
}

/** Grouped first (the default). One shared mode: the Diagram AND the 3D twin. */
export const SLD_GROUP_MODE_OPTIONS: ReadonlyArray<SegmentOption<SldViewMode>> = [
  { value: 'grouped', label: 'Grouped', hint: 'Groups the units by energy type' },
  { value: 'units', label: 'Units', hint: 'Shows every unit individually' },
];

/** Diagram first, like the web portal's switch. */
export const SLD_VIEW_OPTIONS: ReadonlyArray<SegmentOption<SldView>> = [
  { value: '2d', label: 'Diagram', hint: 'Shows the energy-flow diagram' },
  { value: '3d', label: '3D', hint: 'Shows the plant in 3D, as on the web portal' },
];

// Pill geometry — one source for its styles AND its fit footprint. The
// CONTAINER is ≥ touch.min tall (44 iOS / 48 Android, like the inline
// header's pills and the rail) because Fabric drops touches outside a
// parent's layout box, so slop past the pill would be dead (see
// sldModeToggleMetrics). Both top pills have two segments, so they share
// one geometry. (The inline header's pills are sized to their labels:
// `sldViewHeaderGeometry`.)
const TOGGLE = sldModeToggleMetrics(normalizeWidth, 2, touch.min);
/** Every segmented pill's label size (AppText `fontSize`, before width scaling). */
const PILL_LABEL_SIZE = 11;

// The button column: every button a real touch target (≥ touch.min, its
// glyph unchanged) — one source for its styles AND the viewport's keep-out
// math (`sldControlColumnLayout`).
const COLUMN = sldControlColumnMetrics(normalizeWidth, touch.min);

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

/**
 * Footprint of {@link SldViewToggle} (Diagram | 3D, the 2D full screen) —
 * the same pill geometry, anchored `edge` points inside the safe area's
 * top-LEFT corner.
 */
export const SLD_VIEW_TOGGLE_BOX: SldOverlayBox = {
  width: TOGGLE.width,
  height: TOGGLE.height,
  edge: space.lg,
  gap: space.sm,
};

/** Translucent surface shared by the button column and the top pills. */
const controlSurface = (scheme: Scheme) => ({
  backgroundColor: scheme.isDark
    ? 'rgba(17, 24, 39, 0.92)'
    : 'rgba(244, 245, 247, 0.92)',
  borderWidth: TOGGLE.border,
  borderColor: scheme.border,
});

/** The 3D full-screen button's hint: the twin opens turned +90° (clockwise). */
export const SLD_SIDEWAYS_FULLSCREEN_HINT = 'Opens sideways. Turn your phone to the left to read it.';

/**
 * The Pause / Play control's state: the user's Pause / Play, or — when
 * something else stops the motion (`offLabel`, from `sldMotionOff`) — a
 * disabled "animation off" state whose spoken label says why (never a
 * "Pause animation" that does nothing).
 */
export const sldMotionControl = (
  paused: boolean,
  offLabel: string | null | undefined,
): { glyph: string; label: string; disabled: boolean } =>
  offLabel
    ? { glyph: 'motion-photos-off', label: offLabel, disabled: true }
    : paused
      ? { glyph: 'play-arrow', label: 'Play animation', disabled: false }
      : { glyph: 'pause', label: 'Pause animation', disabled: false };

const motionGlyphColor = (scheme: Scheme, disabled: boolean, paused: boolean): string =>
  disabled ? scheme.textSecondary : paused ? scheme.brand : scheme.textPrimary;

const ControlButtons: FC<ControlButtonsProps> = ({
  onZoomIn,
  onZoomOut,
  onToggleRouting,
  routingOrthogonal,
  onToggleLock,
  onFullscreen,
  isLocked,
  motionPaused,
  onToggleMotion,
  motionOffLabel = null,
  currentZoom,
  minZoom,
  maxZoom,
  insetLeft = 0,
  insetBottom = 0,
  maxHeight = Infinity,
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
  const motion = sldMotionControl(motionPaused, motionOffLabel);

  // In reading order; laid out top → bottom, then the next column.
  const buttons: ReactElement[] = [
    <PressableScale
      key="zoom-in"
      disabled={isZoomInDisabled}
      style={styles.button}
      onPress={onZoomIn}
      accessibilityLabel="Zoom in">
      <Plus
        size={ICON_SIZE_MD}
        color={isZoomInDisabled ? scheme.textSecondary : scheme.textPrimary}
      />
    </PressableScale>,
    <PressableScale
      key="zoom-out"
      disabled={isZoomOutDisabled}
      style={styles.button}
      onPress={onZoomOut}
      accessibilityLabel="Zoom out">
      <Minus
        size={ICON_SIZE_MD}
        color={isZoomOutDisabled ? scheme.textSecondary : scheme.textPrimary}
      />
    </PressableScale>,
    <PressableScale
      key="routing"
      style={styles.button}
      onPress={onToggleRouting}
      accessibilityLabel={
        routingOrthogonal ? 'Use curved lines' : 'Use straight lines'
      }>
      <FitOverviewIcon
        size={ICON_SIZE_MD}
        color={routingOrthogonal ? scheme.brand : scheme.textPrimary}
      />
    </PressableScale>,
    <PressableScale
      key="motion"
      style={styles.button}
      onPress={onToggleMotion}
      disabled={motion.disabled}
      accessibilityLabel={motion.label}>
      {/* MaterialIcons glyph (the font is bundled); fixed size like the
          other icon components in the column. */}
      <Icon
        name={motion.glyph}
        size={ICON_SIZE_MD}
        color={motionGlyphColor(scheme, motion.disabled, motionPaused)}
        allowFontScaling={false}
      />
    </PressableScale>,
    <PressableScale
      key="fullscreen"
      style={styles.button}
      onPress={onFullscreen}
      accessibilityLabel="Fullscreen">
      <NodeExpandIcon size={ICON_SIZE_MD} color={scheme.textPrimary} />
    </PressableScale>,
    <PressableScale
      key="lock"
      style={styles.button}
      onPress={onToggleLock}
      accessibilityLabel={isLocked ? 'Unlock pan' : 'Lock pan'}>
      {isLocked ? (
        <LockIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
      ) : (
        <LockIconOpen size={ICON_SIZE_MD} color={scheme.textPrimary} />
      )}
    </PressableScale>,
  ];
  // As few columns as fit under the top-left pill (sldControlColumnLayout).
  const { rows } = sldControlColumnLayout(buttons.length, COLUMN, maxHeight);
  const columns: ReactElement[][] = [];
  for (let k = 0; k < buttons.length; k += rows) {
    columns.push(buttons.slice(k, k + rows));
  }

  return (
    <View style={containerStyle}>
      {columns.map((col, k) => (
        <View key={k} style={styles.column}>
          {col}
        </View>
      ))}
    </View>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    // Geometry = COLUMN; several columns side by side when one would reach
    // under the top-left pill (`maxHeight`).
    container: {
      position: 'absolute',
      bottom: space.lg,
      left: space.lg,
      ...controlSurface(scheme),
      borderWidth: COLUMN.border,
      borderRadius: radiusTokens.md,
      padding: COLUMN.padding,
      gap: COLUMN.gap,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    column: {
      gap: COLUMN.gap,
    },
    button: {
      width: COLUMN.button,
      height: COLUMN.button,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.sm,
    },
  });

interface SegmentedPillProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Geometry (default the top pills' `TOGGLE`). */
  metrics?: SldModeToggleMetrics;
  /**
   * Shrink a label that doesn't fit its segment (default — the fixed
   * over-diagram pills). The header's pills pass false: they are sized to
   * their labels at the rendered size (`sldHeaderPillMetrics`), so nothing
   * is ever shrunk there.
   */
  shrinkLabels?: boolean;
}

/**
 * Two-segment pill shared by the toggles: fixed footprint (`metrics`),
 * targets the full container height, the selected segment announced via
 * `selected`. Each segment's vertical slop is exactly the container's
 * padding + border: its touch area spans the whole pill height and stays
 * inside the pill. No horizontal slop — the segments sit side by side (and
 * each is already a full target wide).
 */
const SegmentedPillBase = <T extends string>({
  options,
  value,
  onChange,
  metrics = TOGGLE,
  shrinkLabels = true,
}: SegmentedPillProps<T>) => {
  const scheme = useScheme();
  const styles = useMemo(() => createToggleStyles(scheme, metrics), [scheme, metrics]);
  const hitSlop = useMemo(
    () => ({ top: metrics.slop, bottom: metrics.slop, left: 0, right: 0 }),
    [metrics.slop],
  );
  return (
    <View style={styles.segmented}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => {
              if (!active) onChange(opt.value);
            }}
            haptic="select"
            selected={active}
            hitSlop={hitSlop}
            accessibilityLabel={opt.label}
            accessibilityHint={opt.hint}>
            <AppText
              fontSize={PILL_LABEL_SIZE}
              lineHeight={14}
              semi_bold={!active}
              bold={active}
              center
              numberOfLines={1}
              adjustsFontSizeToFit={shrinkLabels}
              minimumFontScale={shrinkLabels ? 0.7 : undefined}
              color={active ? scheme.brand : scheme.textSecondary}>
              {opt.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
};

interface SldModeToggleProps {
  mode: SldViewMode;
  onChange: (mode: SldViewMode) => void;
}

/**
 * Grouped ⇄ Units segmented pill over the 2D FULL SCREEN, top-right.
 * Deliberately NOT part of the auto-fading button column: the viewport
 * renders it in its own always-visible, always-tappable overlay so the
 * Units view stays discoverable. Fixed footprint — see
 * {@link SLD_MODE_TOGGLE_BOX}. (Inline, the same switch sits in the header
 * row above the panel — {@link SldViewHeader} — for both views; sideways,
 * on the rail — {@link SldTwinRail}.)
 */
export const SldModeToggle: FC<SldModeToggleProps> = memo(({ mode, onChange }) => (
  <SegmentedPillBase options={SLD_GROUP_MODE_OPTIONS} value={mode} onChange={onChange} />
));
SldModeToggle.displayName = 'SldModeToggle';

interface SldViewToggleProps {
  view: SldView;
  onChange: (view: SldView) => void;
}

/**
 * Diagram ⇄ 3D segmented pill over the 2D FULL SCREEN, top-LEFT, always
 * visible — the way into the sideways 3D twin never hides behind the
 * fading column. (Inline, the same switch heads the panel:
 * {@link SldViewHeader}.) Fixed footprint — see {@link SLD_VIEW_TOGGLE_BOX}.
 */
export const SldViewToggle: FC<SldViewToggleProps> = memo(({ view, onChange }) => (
  <SegmentedPillBase options={SLD_VIEW_OPTIONS} value={view} onChange={onChange} />
));
SldViewToggle.displayName = 'SldViewToggle';

const createToggleStyles = (scheme: Scheme, m: SldModeToggleMetrics) =>
  StyleSheet.create({
    segmented: {
      ...controlSurface(scheme),
      borderWidth: m.border,
      flexDirection: 'row',
      borderRadius: radiusTokens.pill,
      padding: m.padding,
      gap: m.gap,
    },
    segment: {
      width: m.segmentWidth,
      height: m.segmentHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
    },
    segmentActive: {
      backgroundColor: scheme.brandSoft,
    },
  });

/* ─────────── inline: the panel's header row ─────────── */

/** Gap between the header's items (and between its two lines when it wraps). */
export const SLD_VIEW_HEADER_GAP = space.sm;
/** The soft full-screen button's visual (its box is touch.min — IconButton). */
const HEADER_BUTTON_VISUAL = 40;

/**
 * The inline header row's geometry ({@link SldViewHeader} and its loading
 * stand-in {@link SldViewHeaderSkeleton} share it, so the Summary
 * placeholder reserves exactly the row's height — wrapped or not):
 *
 *  - `view` — the "Diagram | 3D" pill (null once the twin can't be shown
 *    for the site);
 *  - `group` — the "Grouped | Units" pill (null when nothing groups);
 *  - `button` — the full-screen button's box (touch.min) while 3D can be
 *    shown; its slot is reserved in BOTH views, so Diagram ⇄ 3D never
 *    re-flows the row (the button itself shows in 3D only);
 *  - `wrapped` / `height` — {@link sldViewHeaderLayout}.
 *
 * Each pill is sized to its widest label at the size it RENDERS (the
 * width-scaled 11 pt, floored at AppText's 11 pt, × the OS text scale
 * capped like AppText), so labels never shrink or get cut; on a narrow
 * phone or with large text, "Grouped | Units" moves to a second line.
 */
export interface SldViewHeaderGeometry {
  view: SldModeToggleMetrics | null;
  group: SldModeToggleMetrics | null;
  button: number;
  wrapped: boolean;
  height: number;
}

const widestBoldLabel = (options: ReadonlyArray<SegmentOption<string>>, pt: number): number =>
  Math.max(0, ...options.map(o => estimateSldTextWidth(o.label, pt, true)));

export const sldViewHeaderGeometry = ({
  width,
  fontScale,
  withView,
  withGroup,
}: {
  /** The row's width (the inline panel's). */
  width: number;
  /** The OS text scale (`useWindowDimensions().fontScale`). */
  fontScale: number;
  /** The twin can be shown for the site (the Diagram | 3D switch shows). */
  withView: boolean;
  /** Something groups (the Grouped | Units switch shows). */
  withGroup: boolean;
}): SldViewHeaderGeometry => {
  const os = Number.isFinite(fontScale) && fontScale > 0 ? Math.min(DEFAULT_MAX_FONT_SCALE, fontScale) : 1;
  const labelPt = Math.max(MIN_FONT_SIZE, normalizeFont(PILL_LABEL_SIZE)) * os;
  const view = withView
    ? sldHeaderPillMetrics(normalizeWidth, touch.min, widestBoldLabel(SLD_VIEW_OPTIONS, labelPt))
    : null;
  const group = withGroup
    ? sldHeaderPillMetrics(normalizeWidth, touch.min, widestBoldLabel(SLD_GROUP_MODE_OPTIONS, labelPt))
    : null;
  const button = withView ? touch.min : 0;
  const { wrapped, height } = sldViewHeaderLayout({
    width,
    gap: SLD_VIEW_HEADER_GAP,
    viewPill: view ?? undefined,
    groupPill: group ?? undefined,
    button,
  });
  return { view, group, button, wrapped, height };
};

/** {@link sldViewHeaderGeometry} for this device's current OS text scale. */
export const useSldViewHeaderGeometry = (
  width: number,
  withView: boolean,
  withGroup: boolean,
): SldViewHeaderGeometry => {
  const { fontScale } = useWindowDimensions();
  return useMemo(
    () => sldViewHeaderGeometry({ width, fontScale, withView, withGroup }),
    [width, fontScale, withView, withGroup],
  );
};

interface SldViewHeaderProps {
  geometry: SldViewHeaderGeometry;
  view: SldView;
  onViewChange: (view: SldView) => void;
  mode: SldViewMode;
  onModeChange: (mode: SldViewMode) => void;
  /** 3D only: opens the sideways full screen (the button is hidden without it). */
  onFullscreen?: () => void;
}

/**
 * The row above the inline energy-flow panel, for BOTH views:
 * `[Diagram | 3D] [Grouped | Units] … [full screen]` — the view switch
 * (Diagram first, like the web), the ONE shared Grouped / Units mode (the
 * Diagram's boxes and the 3D twin's models group the same way), and in 3D
 * the way into the SIDEWAYS full screen on the right (its glyph and hint
 * say it opens turned; the 2D full screen stays in the diagram's own
 * controls column). On a narrow phone / large text the Grouped | Units
 * pill wraps to a second line under Diagram | 3D (`geometry.wrapped`). A
 * fixed height (the geometry's), plain Views, no animated props.
 */
export const SldViewHeader: FC<SldViewHeaderProps> = memo(
  ({ geometry, view, onViewChange, mode, onModeChange, onFullscreen }) => {
    const scheme = useScheme();
    const rowStyle = useMemo(
      () => [headerStyles.row, geometry.wrapped && headerStyles.rowWrapped, { height: geometry.height }],
      [geometry.wrapped, geometry.height],
    );
    return (
      <View style={rowStyle}>
        <View style={geometry.wrapped ? headerStyles.clusterWrapped : headerStyles.cluster}>
          {geometry.view ? (
            <SegmentedPillBase
              options={SLD_VIEW_OPTIONS}
              value={view}
              onChange={onViewChange}
              metrics={geometry.view}
              shrinkLabels={false}
            />
          ) : null}
          {geometry.group ? (
            <SegmentedPillBase
              options={SLD_GROUP_MODE_OPTIONS}
              value={mode}
              onChange={onModeChange}
              metrics={geometry.group}
              shrinkLabels={false}
            />
          ) : null}
        </View>
        {onFullscreen && geometry.button > 0 ? (
          <IconButton
            variant="soft"
            size={HEADER_BUTTON_VISUAL}
            onPress={onFullscreen}
            accessibilityLabel="Fullscreen"
            accessibilityHint={SLD_SIDEWAYS_FULLSCREEN_HINT}>
            <Icon
              name="screen-rotation"
              size={ICON_SIZE_MD}
              color={scheme.brandText}
              allowFontScaling={false}
            />
          </IconButton>
        ) : null}
      </View>
    );
  },
);
SldViewHeader.displayName = 'SldViewHeader';

/**
 * The header row's loading stand-in (the Summary's 300 ms placeholder):
 * the SAME row and clusters with a skeleton per pill — and, in 3D, one for
 * the full-screen button — at the geometry's sizes, so the deferred mount
 * lands without a jump (wrapped or not).
 */
export const SldViewHeaderSkeleton: FC<{ geometry: SldViewHeaderGeometry; withButton: boolean }> = memo(
  ({ geometry, withButton }) => {
    const rowStyle = useMemo(
      () => [headerStyles.row, geometry.wrapped && headerStyles.rowWrapped, { height: geometry.height }],
      [geometry.wrapped, geometry.height],
    );
    const buttonBox = useMemo(
      () => [headerStyles.buttonBox, { width: geometry.button, height: geometry.button }],
      [geometry.button],
    );
    return (
      <View style={rowStyle}>
        <View style={geometry.wrapped ? headerStyles.clusterWrapped : headerStyles.cluster}>
          {geometry.view ? (
            <Skeleton width={geometry.view.width} height={geometry.view.height} radius={radiusTokens.pill} />
          ) : null}
          {geometry.group ? (
            <Skeleton width={geometry.group.width} height={geometry.group.height} radius={radiusTokens.pill} />
          ) : null}
        </View>
        {withButton && geometry.button > 0 ? (
          <View style={buttonBox}>
            <Skeleton
              width={HEADER_BUTTON_VISUAL}
              height={HEADER_BUTTON_VISUAL}
              radius={radiusTokens.pill}
            />
          </View>
        ) : null}
      </View>
    );
  },
);
SldViewHeaderSkeleton.displayName = 'SldViewHeaderSkeleton';

const headerStyles = StyleSheet.create({
  // One line: everything centred on the row.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Two lines: the button stays on the first.
  rowWrapped: {
    alignItems: 'flex-start',
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SLD_VIEW_HEADER_GAP,
  },
  clusterWrapped: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SLD_VIEW_HEADER_GAP,
  },
  buttonBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ─────────── 3D full screen (sideways): the rail ─────────── */

/** The rail's "Diagram" caption: requested size, its OS-scaling cap, the label. */
const RAIL_CAPTION_SIZE = 11;
const RAIL_CAPTION_MAX_SCALE = 1.2;
const RAIL_CAPTION_LINE = 14;
const RAIL_DIAGRAM_LABEL = 'Diagram';
const RAIL_DIAGRAM_HINT = 'Shows the energy-flow diagram, upright';

/**
 * The rail's geometry ({@link sldRailMetrics}): its width fits the caption
 * at its largest (the width-scaled size × the OS-scaling cap, measured
 * with the Poppins advance table) — the rail lives in the turned view,
 * where `adjustsFontSizeToFit` is never used (§19).
 */
export const SLD_TWIN_RAIL = sldRailMetrics(
  touch.min,
  estimateSldTextWidth(
    RAIL_DIAGRAM_LABEL,
    Math.max(MIN_FONT_SIZE, normalizeFont(RAIL_CAPTION_SIZE)) * RAIL_CAPTION_MAX_SCALE,
    true,
  ),
);

/**
 * The rail's Group | Units segments: shorter visible words than the
 * header's ("Group", not "Grouped": a segment is only a round button's
 * inside, 44 pt on iOS). The accessible name is still the visible label
 * (WCAG 2.5.3); same mode, same hints.
 */
export const SLD_RAIL_GROUP_OPTIONS: ReadonlyArray<SegmentOption<SldViewMode>> = [
  { value: 'grouped', label: 'Group', hint: SLD_GROUP_MODE_OPTIONS[0].hint },
  { value: 'units', label: 'Units', hint: SLD_GROUP_MODE_OPTIONS[1].hint },
];
/** The rail labels' requested size (AppText `fontSize`) and the size it renders at. */
const RAIL_LABEL_SIZE = 11;
const RAIL_LABEL_PT = Math.max(MIN_FONT_SIZE, normalizeFont(RAIL_LABEL_SIZE));
/**
 * How far the rail's Group | Units labels may scale with the OS text size:
 * capped where the widest (bold "Group") still fits a segment
 * ({@link sldRailLabelFit}); shrunk below the requested size only when even
 * that can't fit (a tablet's width-scaled font). Never
 * `adjustsFontSizeToFit` — the rail is inside the turned view.
 */
export const SLD_TWIN_RAIL_LABEL_FIT = sldRailLabelFit(
  sldRailSegmentInner(SLD_TWIN_RAIL),
  Math.max(...SLD_RAIL_GROUP_OPTIONS.map(o => estimateSldTextWidth(o.label, 1, true))),
  RAIL_LABEL_PT,
  DEFAULT_MAX_FONT_SCALE,
);

interface SldTwinRailProps {
  /** The rail's rect in the turned content's coords (`sldLandscapeGeometry().rail`). */
  rail: SldRect;
  onClose: () => void;
  /** Back to the upright Diagram (the persisted view). */
  onDiagram: () => void;
  /**
   * Grouped ⇄ Units — the shared mode (the twin's models and the
   * Diagram's boxes group the same way). Omit both to hide the pill
   * (nothing groups).
   */
  groupMode?: SldViewMode;
  onGroupModeChange?: (mode: SldViewMode) => void;
}

/**
 * The sideways 3D full screen's always-visible rail, right of the twin,
 * top → bottom: Close; a round "Diagram" button (glyph + caption) that
 * turns the screen back upright into the 2D diagram — whose own "Diagram |
 * 3D" pill turns it sideways again; and, when something groups, the
 * "Group | Units" pill (two stacked segments, a round button wide —
 * {@link sldRailMetrics}). Every target ≥ touch.min. Lives in the turned
 * content, so it turns with it. Nothing else: the twin carries its own
 * tools (fit, Plan view, tags) and draws its own motion.
 */
export const SldTwinRail: FC<SldTwinRailProps> = memo(
  ({ rail, onClose, onDiagram, groupMode, onGroupModeChange }) => {
    const scheme = useScheme();
    const styles = useMemo(() => createRailStyles(scheme), [scheme]);
    const boxStyle = useMemo(
      () => [styles.rail, { left: rail.x, top: rail.y, width: rail.w }],
      [styles.rail, rail.x, rail.y, rail.w],
    );
    const withGroup = groupMode !== undefined && onGroupModeChange !== undefined;
    const fit = SLD_TWIN_RAIL_LABEL_FIT;
    return (
      <View pointerEvents="box-none" style={boxStyle}>
        <PressableScale style={styles.round} onPress={onClose} accessibilityLabel="Close">
          <Close size={ICON_SIZE_MD} color={scheme.textPrimary} />
        </PressableScale>
        <PressableScale
          style={styles.labelled}
          onPress={onDiagram}
          haptic="select"
          accessibilityLabel={RAIL_DIAGRAM_LABEL}
          accessibilityHint={RAIL_DIAGRAM_HINT}>
          <View style={styles.round}>
            <Icon
              name="account-tree"
              size={ICON_SIZE_MD}
              color={scheme.textPrimary}
              allowFontScaling={false}
            />
          </View>
          <AppText
            fontSize={RAIL_CAPTION_SIZE}
            lineHeight={RAIL_CAPTION_LINE}
            maxFontSizeMultiplier={RAIL_CAPTION_MAX_SCALE}
            semi_bold
            center
            numberOfLines={1}
            color={scheme.textPrimary}>
            {RAIL_DIAGRAM_LABEL}
          </AppText>
        </PressableScale>
        {withGroup ? (
          <View style={styles.segmented}>
            {SLD_RAIL_GROUP_OPTIONS.map(opt => {
              const active = opt.value === groupMode;
              const color = active ? scheme.brand : scheme.textSecondary;
              return (
                <PressableScale
                  key={opt.value}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => {
                    if (!active) onGroupModeChange?.(opt.value);
                  }}
                  haptic="select"
                  selected={active}
                  accessibilityLabel={opt.label}
                  accessibilityHint={opt.hint}>
                  {fit.sizeFactor < 1 ? (
                    // Even the requested size can't fit (tablet): the exact
                    // fitting size, no OS scaling on top.
                    <AppText
                      fixedSize="exact"
                      fontSize={RAIL_LABEL_PT * fit.sizeFactor}
                      lineHeight={16}
                      semi_bold={!active}
                      bold={active}
                      center
                      numberOfLines={1}
                      color={color}>
                      {opt.label}
                    </AppText>
                  ) : (
                    <AppText
                      fontSize={RAIL_LABEL_SIZE}
                      lineHeight={16}
                      maxFontSizeMultiplier={fit.maxFontScale}
                      semi_bold={!active}
                      bold={active}
                      center
                      numberOfLines={1}
                      color={color}>
                      {opt.label}
                    </AppText>
                  )}
                </PressableScale>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  },
);
SldTwinRail.displayName = 'SldTwinRail';

/** The "Diagram" caption's gap and its tallest line (pt) — for the rail's stack height. */
export const SLD_TWIN_RAIL_CAPTION = {
  gap: space.xs,
  line:
    Math.round(
      RAIL_CAPTION_LINE *
        (Math.max(MIN_FONT_SIZE, normalizeFont(RAIL_CAPTION_SIZE)) /
          Math.max(1, normalizeFont(RAIL_CAPTION_SIZE))),
    ) * RAIL_CAPTION_MAX_SCALE,
} as const;

const createRailStyles = (scheme: Scheme) =>
  StyleSheet.create({
    rail: {
      position: 'absolute',
      alignItems: 'center',
      gap: SLD_TWIN_RAIL.gap,
    },
    round: {
      ...controlSurface(scheme),
      width: SLD_TWIN_RAIL.button,
      height: SLD_TWIN_RAIL.button,
      borderRadius: SLD_TWIN_RAIL.button / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The button + its caption are ONE target (the caption is the name).
    labelled: {
      width: SLD_TWIN_RAIL.width,
      alignItems: 'center',
      gap: SLD_TWIN_RAIL_CAPTION.gap,
    },
    // Group | Units: a round button wide, its two segments stacked; each
    // segment is the pill's inside wide (≥ touch.min) and ≥ touch.min tall.
    segmented: {
      ...controlSurface(scheme),
      borderWidth: SLD_TWIN_RAIL.border,
      width: SLD_TWIN_RAIL.button,
      borderRadius: SLD_TWIN_RAIL.button / 2,
      padding: SLD_TWIN_RAIL.pad,
    },
    segment: {
      height: SLD_TWIN_RAIL.segment,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: sldRailSegmentInner(SLD_TWIN_RAIL) / 2,
    },
    segmentActive: {
      backgroundColor: scheme.brandSoft,
    },
  });

export default ControlButtons;
