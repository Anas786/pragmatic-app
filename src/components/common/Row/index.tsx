import React, { FC } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

interface RowProps extends ViewProps {
  children: React.ReactNode;
}

const Row: FC<RowProps> = ({ children, style, ...rest }) => {

  return (
    <View style={[styles.container, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});

export default Row;