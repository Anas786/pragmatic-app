import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { AlarmCardData, mockAlarmsData } from 'src/data/mock';

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

        <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
          {title} - {time}
        </AppText>
      </View>

      <View style={styles.statusContainer}>
        <AppText fontSize={FONT_SIZE_XS} medium color={statusColor}>
          {status}
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
          {statusTime}
        </AppText>
      </View>
    </View>
  );
};

const AlarmsView: FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(16),
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(12),
    gap: normalizeHeight(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
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
