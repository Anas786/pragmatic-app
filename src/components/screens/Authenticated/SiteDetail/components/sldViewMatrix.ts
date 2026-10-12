import { Skia, type SkMatrix } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

/**
 * The SLD viewport's pan / zoom as ONE Skia matrix, for a Skia layer that
 * draws in the diagram's frame space (`DiagramSkiaLayer`), so it can never
 * drift from the RN node-card layer.
 *
 * Replicates the RN node layer's transform chain exactly, folded into one
 * SkMatrix per update:
 *
 *     p' = frameOffset + C + T + s·(p − C)
 *
 * i.e. the centre-layout offset of the bounds-sized frame inside the
 * viewport-sized canvas (`frame`, measured by the canvas's own onLayout),
 * then RN's centre-origin [translate, scale] semantics (C = frame centre,
 * T = pan, s = zoom).
 *
 * ⚠️ Must stay a single `matrix` prop on a `<Group>`. Animating a
 * `transform` ARRAY (rebuilt per frame) on a Group with an `origin` races
 * RN Skia 1.x's composite-prop interop between the UI and render threads at
 * pinch frequency and crashed on device. A matrix host object — one per
 * update, built inside this derived value — is the library's blessed
 * animated-transform path.
 *
 * Kept OUT of any per-frame picture recorder: a pan only re-plays the
 * canvas's command list with the new matrix, never re-records it.
 */
export const useSldViewMatrix = (
  boundsW: number,
  boundsH: number,
  frame: { w: number; h: number } | null,
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  scale: SharedValue<number>,
): SharedValue<SkMatrix> => {
  const offX = frame ? (frame.w - boundsW) / 2 : 0;
  const offY = frame ? (frame.h - boundsH) / 2 : 0;
  const cx = boundsW / 2;
  const cy = boundsH / 2;
  return useDerivedValue(() => {
    const m = Skia.Matrix();
    // Ops pre-concatenate: the first call applies LAST to a point, so this
    // reads bottom-up — un-centre, scale, then offset + centre + pan.
    m.translate(offX + cx + translateX.value, offY + cy + translateY.value);
    m.scale(scale.value, scale.value);
    m.translate(-cx, -cy);
    return m;
  }, [offX, offY, cx, cy]);
};
