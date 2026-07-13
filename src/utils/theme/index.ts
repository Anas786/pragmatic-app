/**
 * Legacy style constants still consumed by unmigrated screens.
 *
 * Dead-code pass (July 2026): all zero-consumer exports were removed —
 * including the entire pre-v2 `ENERGY_SOURCE_*` palette (use
 * `energyPalette` from `src/theme` instead) and the brown/yellow
 * pre-redesign color set. Don't add new usages of anything in this
 * file: new code reads colors from `useScheme()` and sizing from the
 * `src/theme` tokens.
 */

export const WHITE = '#fff';
export const BLUE = '#1EC2F3';
export const INPUT = '#344054';
export const BACKGROUND = '#FDFDFD';
export const PLACEHOLDER_COLOR = '#34405450';

export const ACCENT_GREEN = '#3AD04B';
export const ACCENT_RED = '#D03A3A';
export const ACCENT_BLUE = '#3A5FD0';
export const ACCENT_ORANGE = '#FF8C00';

// Icon Sizes
export const ICON_SIZE_XS = 14;
export const ICON_SIZE_SM = 16;
export const ICON_SIZE_MD = 18;
export const ICON_SIZE_LG = 24;

// Font Sizes
export const FONT_SIZE_XXS = 10;
export const FONT_SIZE_XS = 12;
export const FONT_SIZE_SM = 14;
export const FONT_SIZE_MD = 16;
export const FONT_SIZE_LG = 18;
export const FONT_SIZE_XL = 20;
export const FONT_SIZE_XXL = 24;
export const FONT_SIZE_HUGE = 32;

export * from './colors';
