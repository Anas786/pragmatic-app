/**
 * The splash's ONE full-screen Skia canvas. Everything that moves
 * continuously (dot grid, traces, ignition wave, packets, logo stroke draw,
 * fills, glows, logo exit) is a single SkPicture recorded per frame on the
 * UI thread in a `useDerivedValue` — zero Fabric commits per frame.
 *
 * - React.memo with props frozen after mount: any re-render of a Skia
 *   Canvas re-renders its root and restarts the mapper (Canvas.tsx).
 * - Never `opaque`: on Android that swaps TextureView → SurfaceView, which
 *   ignores the parent's opacity/scale (and the exit fade is exactly that).
 * - No `mode="continuous"`: the picture shared value drives redraws.
 * - Only mounted once the scene exists (after layout) — never in Jest.
 */
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { recordFrame } from './draw';
import type { Scene } from './scene';

interface SplashCanvasProps {
  scene: Scene;
  frameW: SharedValue<number>;
  exitKind: SharedValue<number>;
  exitAtW: SharedValue<number>;
  logoExitAtW: SharedValue<number>;
  reduced: boolean;
}

function SplashCanvas({
  scene,
  frameW,
  exitKind,
  exitAtW,
  logoExitAtW,
  reduced,
}: SplashCanvasProps): React.JSX.Element {
  const picture = useDerivedValue(
    () =>
      recordFrame(
        scene,
        frameW.value,
        exitKind.value,
        exitAtW.value,
        logoExitAtW.value,
        reduced,
      ),
    [scene, reduced],
  );

  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Picture picture={picture} />
    </Canvas>
  );
}

export default memo(SplashCanvas);
