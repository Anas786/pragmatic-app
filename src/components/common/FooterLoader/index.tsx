import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';

const FooterLoader: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.footerLoader}>{children}</View>
);
FooterLoader.displayName = 'FooterLoader';

const styles = StyleSheet.create({
  footerLoader: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});

export default FooterLoader;
