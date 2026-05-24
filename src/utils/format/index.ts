import { PixelRatio, Platform } from 'react-native';
import { HEIGHT, WIDTH } from '../constants';
import dayjs from 'dayjs';

const scale = WIDTH / 393;

export const normalizeFont = (size: number) => {
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
  name.toUpperCase().slice(0, 2).split(' ').map(word => word[0]).join('') ;

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

/** Convert an epoch-ms timestamp to a human-readable relative time string.
 *  Returns 'Just now' / 'N min ago' / 'N hr ago' or a locale date for older. */
export const formatRelativeTime = (raw: string | number | null | undefined): string => {
  if (!raw) return '—';
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
