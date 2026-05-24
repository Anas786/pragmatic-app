import React, { FC, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Surface } from 'src/components/common';
import { Scheme, space, useScheme, useThemedStyles } from 'src/theme';

interface SectionCardProps {
  children: ReactNode;
}

const SectionCard: FC<SectionCardProps> = ({ children }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  return (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      style={themed.sectionCard}>
      {children}
    </Surface>
  );
};

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    sectionCard: {
      gap: space.md,
      borderWidth: 1,
      borderColor: scheme.border,
    },
  });

export default SectionCard;
