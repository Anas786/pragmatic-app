import { Platform } from 'react-native';

export const isIOS = () => {
  return Platform.OS === 'ios';
};

export const FontFamilies = {
  Poppins: {
    light: isIOS() ? 'Poppins-Light' : 'Poppins-Light',
    regular: isIOS() ? 'Poppins-Regular' : 'Poppins-Regular',
    medium: isIOS() ? 'Poppins-Medium' : 'Poppins-Medium',
    semibold: isIOS() ? 'Poppins-SemiBold' : 'Poppins-SemiBold',
    bold: isIOS() ? 'Poppins-Bold' : 'Poppins-Bold',
  },
};
