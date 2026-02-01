import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import Themestore from '../../../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../../assets/utils/fontfamily';
import DatePicker from 'react-native-date-picker';

const Alarmsscreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectdropdown, setselecteddropdown] = useState<string>('');
  const [dropdownid, setdropdownid] = useState<number>();
  const showdropdowns = (id: number) => {
    setShowDropdown(!showDropdown);
    setdropdownid(id);
  };
  const handledropdown = (value: string) => {
    setselecteddropdown(value);
  };

  const alarmtabletitle: string[] = [
    'Time',
    'Alarm ID',
    'Description',
    'Severity',
    'Start At',
    'Elapsed Time',
  ];
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
            borderRadius: !isExpanded ? 16 : 16,
          },
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

      <View style={[styles.alarmfiltercard,
          {
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.alarmfiltercardheader,
            {
              backgroundColor: theme.colors.cardheader,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.title }]}>
              Alarm Filters
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={{
            marginVertical: 8,
            marginHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => showdropdowns(1)}
            activeOpacity={0.8}
            style={[
              styles.dropdownHeader,
              {
                flex: 1,
                borderColor: theme.colors.bordercolor,
                backgroundColor: theme.colors.overlaybackground,
                marginRight: 8,
              },
            ]}
          >
            <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
              Severity
            </Text>
            <FontAwesome6
              name={
                showDropdown && dropdownid === 1 ? 'chevron-up' : 'chevron-down'
              }
              size={14}
              iconStyle="solid"
              color={theme.colors.title}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showdropdowns(2)}
            activeOpacity={0.8}
            style={[
              styles.dropdownHeader,
              {
                flex: 1,
                borderColor: theme.colors.bordercolor,
                backgroundColor: theme.colors.overlaybackground,
              },
            ]}
          >
            <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
              Alarms
            </Text>
            <FontAwesome6
              name={
                showDropdown && dropdownid === 2 ? 'chevron-up' : 'chevron-down'
              }
              size={14}
              iconStyle="solid"
              color={theme.colors.title}
            />
          </TouchableOpacity>
        </View>

        {showDropdown && dropdownid === 1 && (
          <View
            style={[
              styles.dropdownList,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('High')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'High'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                High
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('Medium')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'Medium'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('Low')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'Low'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showDropdown && dropdownid === 2 && (
          <View
            style={[
              styles.dropdownList,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('Alarm 1')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'Alarm 1'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                Alarm 1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('Alarm 2')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'Alarm 2'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                Alarm 2
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dropdownItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.bordercolor,
                },
              ]}
              onPress={() => handledropdown('Alarm 3')}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  {
                    color:
                      selectdropdown === 'Alarm 3'
                        ? theme.colors.iconcolor
                        : theme.colors.text,
                  },
                ]}
              >
                Alarm 3
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.alarmstatescontainer}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          
          <View
            style={[
              styles.alarmstatebox,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <FontAwesome6 
            name='triangle-exclamation'
            iconStyle='solid'
            color={theme.colors.alarmstatusiconred}
            size={20}
            style={{width: 20, height: 20,}}
            />
            <Text style={[styles.statusvalue, { color: theme.colors.title }]}>0</Text>
            <Text style={[styles.statusname, { color: theme.colors.text }]}>Critical</Text>
          </View>

          <View
            style={[
              styles.alarmstatebox,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <FontAwesome6 
            name='circle-exclamation'
            iconStyle='solid'
            color={theme.colors.alarmstatusiconorange}
            size={20}
            style={{width: 20, height: 25,}}
            />
            <Text style={[styles.statusvalue, { color: theme.colors.title }]}>0</Text>
            <Text style={[styles.statusname, { color: theme.colors.text }]}>Major</Text>
          </View>
        
        </View>
      </View>

      <View style={styles.alarmstatescontainer}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          
          <View
            style={[
              styles.alarmstatebox,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <FontAwesome6 
            name='bell'
            iconStyle='regular'
            color={theme.colors.alarmstatusicongreen}
            size={20}
            style={{width: 20, height: 20,}}
            />
            <Text style={[styles.statusvalue, { color: theme.colors.title }]}>0</Text>
            <Text style={[styles.statusname, { color: theme.colors.text }]}>Minor</Text>
          </View>

          <View
            style={[
              styles.alarmstatebox,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <FontAwesome6 
            name='comment-dots'
            iconStyle='regular'
            color={theme.colors.alarmstatusiconblue}
            size={20}
            style={{width: 20, height: 25,}}
            />
            <Text style={[styles.statusvalue, { color: theme.colors.title }]}>0</Text>
            <Text style={[styles.statusname, { color: theme.colors.text }]}>Warning</Text>
          </View>
        
        </View>
      </View>

      <View style={styles.alarmstatescontainer}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          
          <View
            style={[
              styles.alarmstatebox,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          >
            <FontAwesome6 
            name='circle-exclamation'
            iconStyle='solid'
            color={theme.colors.alarmstatusiconpurple}
            size={20}
            style={{width: 20, height: 20,}}
            />
            <Text style={[styles.statusvalue, { color: theme.colors.title }]}>0</Text>
            <Text style={[styles.statusname, { color: theme.colors.text }]}>Information</Text>
          </View>
        
        </View>
      </View>

      <View
        style={[
          styles.alarmreportboxtable,
          { backgroundColor: theme.colors.cardheader },
        ]}
      >
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          scrollEventThrottle={16}
        >
          {alarmtabletitle.map((title, index) => {
            return (
              <View
                key={index}
                style={{
                  padding: 12,
                  backgroundColor: theme.colors.cardheader,
                  borderLeftWidth: 1,
                  borderTopWidth: 1,
                  borderRightWidth: 1,
                  borderColor: theme.colors.bordercolor,
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[styles.tabletitle, { color: theme.colors.title }]}
                >
                  {title}
                </Text>
              </View>
            );
          })}
        </ScrollView>
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
        <Text style={[styles.tabledata, { color: theme.colors.title }]}>
          No Rows
        </Text>
      </View>
    </View>
  );
};

export default Alarmsscreen;

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
  headerTitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
  },
  refreshicon: {
    width: 24,
    height: 24,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmfiltercard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  alarmfiltercardheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownText: {
    fontFamily: getFontFamily('true', 'regular'),
    fontSize: 12,
    lineHeight: 18,
  },
  dropdownList: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 5,
    elevation: 5,
    zIndex: 9,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dropdownItemText: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
  },
  alarmstatescontainer: {
    marginBottom: 12,
  },
  alarmstatebox:{
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flex: 1,
  },
  statusvalue:{
    fontSize: 16,
    fontFamily: getFontFamily('true', 'bold'),
    marginVertical: 8
  },
  statusname:{
    fontSize: 10,
    fontFamily: getFontFamily('true', 'regular'),
  },
  alarmreportboxtable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletitle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },
  tabledata: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
  },

});
