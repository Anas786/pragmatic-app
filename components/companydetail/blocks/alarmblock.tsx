import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Themestore from '../../../store/themestore';
import { getFontFamily } from '../../../assets/utils/fontfamily';

const Alarmblock: React.FC = () => {
  const theme = Themestore(state => state.theme);

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
            { backgroundColor: theme.colors.cardscolorred },
          ]}
        />
        <FontAwesome6
          iconStyle="solid"
          name="triangle-exclamation"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.alarmstatusiconred}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginLeft: 4 }}>
              <View
                style={[
                  styles.priorityindicator,
                  {
                    backgroundColor: theme.colors.cardscolorred,
                    borderWidth: 1,
                    borderColor: theme.colors.cardscolorred,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityindicatortext,
                    { color: theme.colors.iconbuttontext },
                  ]}
                >
                  Priority
                </Text>
              </View>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                Wind Turbine 01 - 10:15 AM
              </Text>
            </View>
          </View>
        </View>
        <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <View style={{ marginRight: 4 }}>
            <Text style={[styles.alarmLabel, { color: theme.colors.highlighted }]}>
                Solved
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                At 12:15 PM
              </Text>
            </View>
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
            { backgroundColor: theme.colors.alarmstatusiconorange },
          ]}
        />
        <FontAwesome6
          iconStyle="solid"
          name="circle-exclamation"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.alarmstatusiconorange}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginLeft: 4 }}>
              <View
                style={[
                  styles.priorityindicator,
                  {
                    backgroundColor: theme.colors.alarmstatusiconorange,
                    borderWidth: 1,
                    borderColor: theme.colors.alarmstatusiconorange,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityindicatortext,
                    { color: theme.colors.iconbuttontext },
                  ]}
                >
                  Major
                </Text>
              </View>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                Solar 01 - 11:15 AM
              </Text>
            </View>
          </View>
        </View>
        <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <View style={{ marginRight: 4 }}>
            <Text style={[styles.alarmLabel, { color: theme.colors.alarmstatusiconred }]}>
                Unsolved
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                ETA 2:15 PM
              </Text>
            </View>
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
            { backgroundColor: theme.colors.alarmstatusicongreen },
          ]}
        />
        <FontAwesome6
          iconStyle="solid"
          name="bell"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.alarmstatusicongreen}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginLeft: 4 }}>
              <View
                style={[
                  styles.priorityindicator,
                  {
                    backgroundColor: theme.colors.alarmstatusicongreen,
                    borderWidth: 1,
                    borderColor: theme.colors.alarmstatusicongreen,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityindicatortext,
                    { color: theme.colors.iconbuttontext },
                  ]}
                >
                  Minor
                </Text>
              </View>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                Solar 02 Dusty - 11:15 AM
              </Text>
            </View>
          </View>
        </View>
        <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <View style={{ marginRight: 4 }}>
            <Text style={[styles.alarmLabel, { color: theme.colors.alarmstatusicongreen }]}>
                Solved
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                At 12:15 PM
              </Text>
            </View>
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
            { backgroundColor: theme.colors.alarmstatusiconblue },
          ]}
        />
        <FontAwesome6
          iconStyle="solid"
          name="comment-dots"
          size={20}
          style={{ width: 20, height: 20, marginRight: 8 }}
          color={theme.colors.alarmstatusiconblue}
        />
        <View style={styles.alarmcontent}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View style={{ marginLeft: 4 }}>
              <View
                style={[
                  styles.priorityindicator,
                  {
                    backgroundColor: theme.colors.alarmstatusiconblue,
                    borderWidth: 1,
                    borderColor: theme.colors.alarmstatusiconblue,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityindicatortext,
                    { color: theme.colors.iconbuttontext },
                  ]}
                >
                  Warning
                </Text>
              </View>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                Solar Battery Weak - 11:39 AM
              </Text>
            </View>
          </View>
        </View>
        <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
            }}
          >
            <View style={{ marginRight: 4 }}>
            <Text style={[styles.alarmLabel, { color: theme.colors.alarmstatusiconred }]}>
                Unsolved
              </Text>
              <Text style={[styles.alarmValue, { color: theme.colors.title }]}>
                ETA 1:05 PM
              </Text>
            </View>
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
  priorityindicator: {
    padding: 2,
    borderRadius: 65,
    borderWidth: 1,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  priorityindicatortext: {
    fontSize: 7,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
});
