import React, { FC, useMemo } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText, Avatar } from 'src/components/common';
import { useUserStore } from 'src/hooks/useUserStore';
import { useThemeStore } from 'src/hooks/useThemeStore';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import dayjs from 'dayjs';

const Profile: FC = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const InfoRow: FC<{
    icon: string;
    label: string;
    value: string;
  }> = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={ICON_SIZE_LG} color={colors.textSecondary} />
      </View>
      <View style={styles.infoText}>
        <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
          {label}
        </AppText>
        <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
          {value}
        </AppText>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.splashBg} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={ICON_SIZE_LG} color={colors.primaryText} />
        </TouchableOpacity>
        <AppText fontSize={FONT_SIZE_MD} bold color={colors.primaryText}>
          Profile
        </AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Avatar
            name={user?.name || 'User'}
            size={100}
            imageUrl={user?.image}
          />
          <AppText
            fontSize={FONT_SIZE_MD}
            bold
            color={colors.primaryText}
            style={styles.userName}>
            {user?.name || 'User'}
          </AppText>
          <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
            {user?.company || 'Company'}
          </AppText>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="account-outline" label="Full Name" value={user?.name || '-'} />
          <View style={styles.divider} />
          <InfoRow icon="email-outline" label="Email" value={user?.email || '-'} />
          <View style={styles.divider} />
          <InfoRow icon="phone-outline" label="Phone" value={user?.phone || '-'} />
          <View style={styles.divider} />
          <InfoRow icon="office-building-outline" label="Company" value={user?.company || '-'} />
          <View style={styles.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Last Login"
            value={user?.login_date ? dayjs(user.login_date).format('DD MMM YYYY, hh:mm A') : '-'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.splashBg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.inputDarkBorder,
      paddingHorizontal: normalizeWidth(12), paddingVertical: normalizeHeight(14),
    },
    backBtn: { width: normalizeWidth(36), height: normalizeWidth(36), alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: normalizeWidth(16), gap: normalizeHeight(24) },
    avatarSection: { alignItems: 'center', paddingTop: normalizeHeight(16), gap: normalizeHeight(8) },
    userName: { marginTop: normalizeHeight(4) },
    infoCard: {
      backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16), padding: normalizeWidth(16),
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: normalizeHeight(12), gap: normalizeWidth(14) },
    infoIconWrap: {
      width: normalizeWidth(40), height: normalizeWidth(40), borderRadius: normalizeWidth(10),
      backgroundColor: colors.inputDarkBg, alignItems: 'center', justifyContent: 'center',
    },
    infoText: { flex: 1, gap: normalizeHeight(2) },
    divider: { height: 1, backgroundColor: colors.inputDarkBorder },
  });

export default Profile;
