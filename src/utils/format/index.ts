import { PixelRatio, Platform } from 'react-native';
import { HEIGHT, WIDTH } from '../constants';
import { formatShortDate, toEpochMs } from '../dates';
import dayjs from 'dayjs';

const scale = WIDTH / 393;

/**
 * Width-scaled font size (393pt design width). Same formula on both
 * platforms — the old Android `− 2` made every Android label 2sp smaller
 * than its iOS twin (10 → 8sp). Text-size accessibility scaling is applied
 * ON TOP of this by the OS (AppText caps it at 1.3×).
 */
export const normalizeFont = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

/**
 * The pre-v3 formula (Android `− 2`). Used ONLY by `AppText fixedSize`
 * so fixed-geometry canvases (SLD node cards) stay pixel-identical.
 */
export const normalizeFontLegacy = (size: number) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

export const normalizeHeight = (size: number) => {
  return (size / 852) * HEIGHT;
};

export const normalizeWidth = (size: number) => {
  return (size / 393) * WIDTH;
};

export const getInitials = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

export const handlePhoneNumber = (input: string) => {
  // Format the input as "XX XXX XXXX"
  const formattedInput = input.replace(
    /^(\d{2})(\d{3})(\d{0,4})$/,
    ' $1 $2 $3',
  );

  return formattedInput;
};

export const hexToRGB = (hexColor: string, alpha?: number): string => {
  let hex = hexColor.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }

  if (!/^([0-9A-F]{6})$/i.test(hex)) {
    throw new Error('Invalid hex color');
  }

  const [r, g, b] = hex.match(/\w\w/g)!.map(x => parseInt(x, 16));
  return alpha != null
    ? `rgba(${r}, ${g}, ${b}, ${alpha})`
    : `rgb(${r}, ${g}, ${b})`;
};

export const formatDate = (date: Date, format = 'DD-MM-YYYY') => {
  return dayjs(date).format(format);
};

/** Format a number (or parseable string) to `decimals` decimal places,
 *  returning an em-dash for non-finite / null / undefined inputs. */
export const formatNumber = (
  value: number | string | null | undefined,
  decimals = 2,
): string => {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value);
  } else {
    return '—';
  }
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** Locale-format an energy value (kWh) to `decimals` decimal places. */
export const formatKwh = (value: number, decimals = 2): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Future timestamps within this skew read as "Just now" (device clocks
 *  and backend clocks drift); further in the future is treated as bad data.
 *  Mirrors `FUTURE_SKEW_MS` in `utils/freshness.ts`. */
const RELATIVE_FUTURE_SKEW_MS = 5 * 60_000;

/**
 * Data age as text: 'Just now' (< 60 s, including up to 5 min of future
 * clock skew), 'N min ago', 'N h ago' (< 24 h), then an absolute date
 * '28 Sep' ('28 Sep 2025' in another year). Never a bare clock time.
 * Unparsable input, or a timestamp more than 5 min in the future → '—'.
 *
 * Accepts epoch ms (number or numeric string), ISO strings and Dates.
 */
export const formatRelativeTime = (raw: unknown, now: number = Date.now()): string => {
  const ms = toEpochMs(raw);
  if (ms === null) return '—';
  const diff = now - ms;
  if (diff < -RELATIVE_FUTURE_SKEW_MS) return '—';
  const diffSec = Math.max(0, Math.floor(diff / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  return formatShortDate(ms, now);
};

/** Locale wall-clock time ('14:32' or '2:32 PM' per device setting) —
 *  for "Updated hh:mm" captions, never for data age. */
export const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

/** '30 Sep, 14:00' ('30 Sep 2025, 14:00' in another year) — for readings
 *  older than 24 h where a relative age would hide the time of day. */
export const formatDateTimeShort = (ms: number, now: number = Date.now()): string =>
  `${formatShortDate(ms, now)}, ${formatClock(ms)}`;
