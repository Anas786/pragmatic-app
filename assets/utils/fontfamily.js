import { FontFamilies } from '../constants/font';

export const getFontFamily = (isLTR, weight) => {
  const selectedFontFamily = isLTR
    ? FontFamilies.Poppins
    : FontFamilies.Poppins;

  return selectedFontFamily[weight];
};
