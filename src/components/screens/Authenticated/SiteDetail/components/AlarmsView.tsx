import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  ACCENT_RED,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

interface AlarmCardProps {
  priority: 'Priority' | 'Major' | 'Minor' | 'Warning';
  title: string;
  time: string;
  status: 'Solved' | 'Unsolved';
  statusTime: string;
  icon: string;
  accentColor: string;
  priorityColor: string;
  statusColor: string;
}

const AlarmCard: FC<AlarmCardProps> = ({
  priority,
  title,
  time,
  status,
  statusTime,
  icon,
  accentColor,
  priorityColor,
  statusColor,
}) => {
  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      
      <View style={styles.iconContainer}>
        <AppText fontSize={24}>{icon}</AppText>
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
  const alarmsData: AlarmCardProps[] = [
    {
      priority: 'Priority',
      title: 'Wind Turbine 01',
      time: '10:15 AM',
      status: 'Solved',
      statusTime: 'At 12:15 PM',
      icon: '⚠️',
      accentColor: ACCENT_RED,
      priorityColor: ACCENT_RED,
      statusColor: ACCENT_GREEN,
    },
    {
      priority: 'Major',
      title: 'Solar 01',
      time: '11:15 AM',
      status: 'Unsolved',
      statusTime: 'ETA 2:15 PM',
      icon: '❗',
      accentColor: '#FF8C00',
      priorityColor: '#FF8C00',
      statusColor: ACCENT_RED,
    },
    {
      priority: 'Minor',
      title: 'Solar 02 Dusty',
      time: '11:15 AM',
      status: 'Solved',
      statusTime: 'At 12:15 PM',
      icon: '🔔',
      accentColor: ACCENT_GREEN,
      priorityColor: ACCENT_GREEN,
      statusColor: ACCENT_GREEN,
    },
    {
      priority: 'Warning',
      title: 'Solar Battery Weak',
      time: '11:39 AM',
      status: 'Unsolved',
      statusTime: 'ETA 1:05 PM',
      icon: '💬',
      accentColor: ACCENT_BLUE,
      priorityColor: ACCENT_BLUE,
      statusColor: ACCENT_RED,
    },
  ];

  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
        Alarms
      </AppText>
      <View style={styles.alarmsList}>
        {alarmsData.map((alarm, index) => (
          <AlarmCard key={index} {...alarm} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(12),
  },
  alarmsList: {
    gap: normalizeHeight(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
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
