import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  WHITE,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { AlarmCardData, mockAlarmsData } from 'src/data/mock';

const AlarmsView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const AlarmCard: FC<AlarmCardData> = ({
    priority,
    title,
    time,
    status,
    statusTime,
    iconName,
    iconColor,
    accentColor,
    priorityColor,
    statusColor,
  }) => {
    return (
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.iconContainer}>
          <Icon name={iconName} size={ICON_SIZE_LG} color={iconColor} />
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <AppText fontSize={FONT_SIZE_XXS} bold color={WHITE}>
              {priority}
            </AppText>
          </View>

          <AppText fontSize={FONT_SIZE_XS} color={colors.primaryText}>
            {title} - {time}
          </AppText>
        </View>

        <View style={styles.statusContainer}>
          <AppText fontSize={FONT_SIZE_XS} medium color={statusColor}>
            {status}
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            {statusTime}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          Alarms
        </AppText>
      </View>
      <View style={styles.body}>
        {mockAlarmsData.map((alarm, index) => (
          <AlarmCard key={index} {...alarm} />
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.inputDarkBg,
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
      gap: normalizeHeight(12),
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      padding: normalizeWidth(12),
      gap: normalizeWidth(12),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(50),
      borderRadius: 2,
    },
    iconContainer: {
      width: normalizeWidth(40),
      height: normalizeWidth(40),
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      gap: normalizeHeight(6),
    },
    priorityBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(4),
      borderRadius: 100,
    },
    statusContainer: {
      alignItems: 'flex-end',
      gap: normalizeHeight(4),
    },
  });

export default AlarmsView;
