import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';

const Alarmblock: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [toggleactive, settoggleactive] = useState<boolean>(false);
  const [priorityalarm, setpriorityalarm] = useState<boolean>(false);
  const handletoggle = () => {
    settoggleactive(prev => !prev);
    setpriorityalarm(prev => !prev);
  };
  return (
    <View style={[styles.alarmbox, { borderColor: theme.colors.bordercolor }]}>
      <View
        style={[
          styles.alarmboxheader,
          { backgroundColor: theme.colors.cardheader },
        ]}
      >
        <Text
          style={[styles.alarmboxheadertitile, { color: theme.colors.title }]}
        >
          Alarms
        </Text>
      </View>
      <View
        style={[
          styles.alarmCardContainer,
          {
            backgroundColor: theme.colors.overlaybackground,
            marginBottom: 8,
          },
        ]}
      >
        <View
          style={[
            styles.indicatorBar,
            { backgroundColor: !priorityalarm
                ? theme.colors.cardscolorred
                : theme.colors.cardscolorblue },
          ]}
        />
        <FontAwesome6
          iconStyle="regular"
          name="clock"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.iconsecondary}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginRight: 8 }}>
              <Text style={[styles.alarmLabel, { color: theme.colors.text }]}>
                Alarm Name
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                10:15 AM
              </Text>
            </View>
            <View
              style={[
                styles.priorityindicator,
                {
                  backgroundColor: !priorityalarm
                    ? theme.colors.cardscolorred
                    : theme.colors.cardscolorblue,
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityindicatortext,
                  { color: theme.colors.iconbuttontext },
                ]}
              >
                {!priorityalarm ? 'Priority' : 'Normal'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.alarmtoggleContainer}>
          <TouchableOpacity
            onPress={handletoggle}
            style={[
              styles.togglebutton,
              {
                backgroundColor: toggleactive
                  ? theme.colors.buttonbg
                  : 'transparent',
                borderColor: toggleactive
                  ? theme.colors.buttonbg
                  : theme.colors.bordercolor,
              },
            ]}
          >
            <View
              style={[styles.togglecircle, { left: !toggleactive ? 5 : 25 }]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.alarmCardContainer,
          {
            backgroundColor: theme.colors.overlaybackground,
            marginBottom: 8,
          },
        ]}
      >
        <View
          style={[
            styles.indicatorBar,
            { backgroundColor: priorityalarm
                ? theme.colors.cardscolorred
                : theme.colors.cardscolorblue },
          ]}
        />
        <FontAwesome6
          iconStyle="regular"
          name="clock"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.iconsecondary}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginRight: 8 }}>
              <Text style={[styles.alarmLabel, { color: theme.colors.text }]}>
                Alarm Name
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                10:15 AM
              </Text>
            </View>
            <View
              style={[
                styles.priorityindicator,
                {
                  backgroundColor: priorityalarm
                    ? theme.colors.cardscolorred
                    : theme.colors.cardscolorblue,
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityindicatortext,
                  { color: theme.colors.iconbuttontext },
                ]}
              >
                {priorityalarm ? 'Priority' : 'Normal'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.alarmtoggleContainer}>
          <TouchableOpacity
            onPress={handletoggle}
            style={[
              styles.togglebutton,
              {
                backgroundColor: !toggleactive
                  ? theme.colors.buttonbg
                  : 'transparent',
                borderColor: !toggleactive
                  ? theme.colors.buttonbg
                  : theme.colors.bordercolor,
              },
            ]}
          >
            <View
              style={[styles.togglecircle, { left: toggleactive ? 5 : 25 }]}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View
        style={[
          styles.alarmCardContainer,
          {
            backgroundColor: theme.colors.overlaybackground,
            marginBottom: 8,
          },
        ]}
      >
        <View
          style={[
            styles.indicatorBar,
            { backgroundColor: priorityalarm
                ? theme.colors.cardscolorred
                : theme.colors.cardscolorblue },
          ]}
        />
        <FontAwesome6
          iconStyle="regular"
          name="clock"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.iconsecondary}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginRight: 8 }}>
              <Text style={[styles.alarmLabel, { color: theme.colors.text }]}>
                Alarm Name
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                10:15 AM
              </Text>
            </View>
            <View
              style={[
                styles.priorityindicator,
                {
                  backgroundColor: priorityalarm
                    ? theme.colors.cardscolorred
                    : theme.colors.cardscolorblue,
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityindicatortext,
                  { color: theme.colors.iconbuttontext },
                ]}
              >
                {priorityalarm ? 'Priority' : 'Normal'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.alarmtoggleContainer}>
          <TouchableOpacity
            onPress={handletoggle}
            style={[
              styles.togglebutton,
              {
                backgroundColor: !toggleactive
                  ? theme.colors.buttonbg
                  : 'transparent',
                borderColor: !toggleactive
                  ? theme.colors.buttonbg
                  : theme.colors.bordercolor,
              },
            ]}
          >
            <View
              style={[styles.togglecircle, { left: toggleactive ? 5 : 25 }]}
            />
          </TouchableOpacity>
        </View>
      </View>
      
    </View>
  );
};

export default Alarmblock;

const styles = StyleSheet.create({
  alarmbox: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 20,
    paddingBottom: 8,
  },
  alarmboxheader: {
    padding: 12,
    gap: 12,
    height: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  alarmboxheadertitile: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 18,
  },

  alarmCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginTop: 8,
  },
  indicatorBar: {
    width: 2,
    height: 20,
    borderRadius: 100,
    marginRight: 8,
  },
  alarmcontent: {
    flex: 1,
  },
  alarmLabel: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'regular'),
    marginBottom: 2,
    lineHeight: 12,
  },
  alarmValue: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
  alarmtoggleContainer: {
    marginLeft: 8,
  },
  togglebutton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    position: 'relative',
  },
  togglecircle: {
    position: 'absolute',
    borderRadius: 100,
    width: 10,
    height: 10,
    backgroundColor: '#ffffff',
  },
  priorityindicator: {
    height: 28,
    padding: 6,
    borderRadius: 65,
    borderWidth: 1,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityindicatortext: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
});
