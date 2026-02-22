import { PixelRatio, Platform } from 'react-native';
import { HEIGHT, WIDTH } from '../constants';
import _ from 'lodash';
import { Item } from 'src/hooks/useOrderStore';
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
  _.toUpper(`${_.get(name, '[0]', '')}${_.get(name, '[1]', '')}`);

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

export const formatCurrency = (amount: number): string => {
  return `SAR ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateTotal = (items: Item[]): number => {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return total;
};

export const formatDate = (date: Date, format = 'DD-MM-YYYY') => {
  return dayjs(date).format(format);
};
