import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import Themestore from '../../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../../assets/utils/fontfamily';
import DatePicker from 'react-native-date-picker';

const DevicesHealthScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState<boolean>(false);
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.card,
          {
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.cardHeader,
            {
              backgroundColor: theme.colors.cardheader,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              Date Time Range
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.datepickerbackground,
                paddingVertical: 6,
                paddingHorizontal: 12,
                height: 24,
                borderRadius: 65,
                marginHorizontal: 8,
              }}
              onPress={() => setOpen(true)}
            >
              <FontAwesome6
                name="calendar"
                size={12}
                color={theme.colors.iconbuttontext}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: theme.colors.iconbuttontext,
                  fontFamily: getFontFamily('true', 'medium'),
                }}
              >
                15/12/25 - 17/12/25
              </Text>
              <DatePicker
                modal
                open={open}
                date={date}
                onConfirm={date => {
                  setOpen(false);
                  setDate(date);
                }}
                onCancel={() => {
                  setOpen(false);
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.refreshicon,
                { borderWidth: 1, borderColor: theme.colors.cardscolorgreen },
              ]}
            >
              <FontAwesome6
                name="rotate"
                iconStyle="solid"
                color={theme.colors.iconcolor}
                size={12}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.healthchartbox,
          { borderColor: theme.colors.bordercolor },
        ]}
      >
        <View
          style={[
            styles.healthchartboxheader,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
            Chart
          </Text>
        </View>
        
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderColor: theme.colors.inputborder,
          }}
        >
          <Text style={[styles.healthchartdata, { color: theme.colors.text }]}>
            No Data
          </Text>
        </View>
      
      </View>

      <View>
        <View
          style={[
            styles.healthreportboxheader,
            {
              backgroundColor: theme.colors.cardheader,
              borderColor: theme.colors.inputborder,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
            Report
          </Text>
        </View>

        <View
          style={[
            styles.healthreportboxtable,
            { backgroundColor: theme.colors.cardheader },
          ]}
        >
          <View
            style={{
              padding: 12,
              backgroundColor: theme.colors.cardheader,
              borderLeftWidth: 1,
              borderLeftColor: theme.colors.inputborder,
              flex: 1,
              alignItems: 'center'
            }}
          >
            <Text style={[styles.tabletitle, { color: theme.colors.title }]}>
              Time
            </Text>
          </View>

          <View
            style={{
              padding: 12,
              backgroundColor: theme.colors.cardheader,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: theme.colors.inputborder,
              flex: 1,
              alignItems: 'center'
            }}
          >
            <Text style={[styles.tabletitle, { color: theme.colors.title }]}>
              Event Type
            </Text>
          </View>

          <View
            style={{
              padding: 12,
              backgroundColor: theme.colors.cardheader,
              borderRightWidth: 1,
              borderRightColor: theme.colors.inputborder,
              flex: 1,
              alignItems: 'center'
            }}
          >
            <Text style={[styles.tabletitle, { color: theme.colors.title }]}>
              Disconnect Reason
            </Text>
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.inputborder,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            backgroundColor: theme.colors.cardheader,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 80,
          }}
        >
            <Text style={[styles.tabledata, { color: theme.colors.title }]}>No Rows</Text>
        </View>
      </View>
    </View>
  );
};

export default DevicesHealthScreen;

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

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshicon: {
    width: 24,
    height: 24,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthchartbox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    height: 120,
  },
  healthchartboxheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
  },
  healthchartdata: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    lineHeight: 12,
  },
  healthreportboxheader: {
    borderWidth: 1,
    padding: 12,
    borderTopWidth: 0,
  },
  healthreportboxtable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletitle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },
  tabledata:{
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  }
});
