import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import Themestore from '../../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../../assets/utils/fontfamily';

const DevicesScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.card,
          { borderWidth: 1, borderColor: theme.colors.bordercolor,
            borderRadius: !isExpanded ? 16 : 16, },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="clock"
              iconStyle="regular"
              size={20}
              color={theme.colors.text}
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              17 Dec, 2025, 24:43:03 PM
            </Text>
          </View>

          <View style={styles.headerRight}>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={15}
              color={theme.colors.title}
            />
          </View>
        </TouchableOpacity>
      </View>
      
      <View
        style={[
          styles.card,
          { borderWidth: 1, borderColor: theme.colors.bordercolor,
            borderRadius: !isExpanded ? 16 : 16, },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
              borderRadius: !isExpanded ? 16 : 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <FontAwesome6
              name="clock"
              iconStyle="regular"
              size={20}
              color={theme.colors.text}
              style={{ marginRight: 6, width: 20, height: 20 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              17 Dec, 2025, 24:43:03 PM
            </Text>
          </View>

          <View style={styles.headerRight}>
            <FontAwesome6
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              iconStyle="solid"
              size={15}
              color={theme.colors.title}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DevicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
