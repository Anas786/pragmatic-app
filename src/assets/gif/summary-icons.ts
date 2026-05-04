/**
 * Summary-tab card icons (Lottie-equivalent GIFs).
 *
 * Uses relative `require()` paths so Metro's asset resolver picks them up
 * reliably — alias-form requires like `require('src/assets/lottie-gif/...')`
 * don't always make it through babel-plugin-module-resolver for non-JS
 * assets and cause the importing module (and any barrel above it) to
 * silently fail at runtime, which cascades into "X of undefined" errors
 * on completely unrelated screens.
 *
 * Maps to the web-frontend convention:
 *   yield   → electricJson  (electric.gif)
 *   revenue → revenueJson   (revenue.gif)
 *   co2     → co2Json       (co2.gif)
 *   coal    → coalJson      (coal.gif)
 *   trees   → treePlantJson (treePlant.gif)
 */

export const electricGif = require('../lottie-gif/electric.gif');
export const revenueGif = require('../lottie-gif/revenue.gif');
export const co2Gif = require('../lottie-gif/co2.gif');
export const coalGif = require('../lottie-gif/coal.gif');
export const treePlantGif = require('../lottie-gif/treePlant.gif');
