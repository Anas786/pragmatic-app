import React, { FC, useMemo } from 'react';
import { Image, ImageSourcePropType, ImageStyle } from 'react-native';

interface GifImageProps {
  source: ImageSourcePropType;
  size?: number;
}

const GifImage: FC<GifImageProps> = ({ source, size }) => {
  const sized = useMemo<ImageStyle>(() => ({ width: size, height: size }), [size]);
  return <Image style={sized} resizeMode="contain" source={source} />;
};

export default GifImage;
