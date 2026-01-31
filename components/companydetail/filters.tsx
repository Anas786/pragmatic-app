import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ScrollView } from 'react-native-gesture-handler';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { Filterprops } from '../../types/filter';
import { getFontFamily } from '../../assets/utils/fontfamily';
import Themestore from '../../store/themestore';

const Filters: React.FC<Filterprops> = ({selectFilter, selectedfilter}) => {
    const theme = Themestore(state => state.theme);
    return (
    <View style={[styles.filterRow]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor:
              selectedfilter === 'Summary'
                ? theme.colors.buttonbg
                : 'transparent',
            borderColor:
              selectedfilter === 'Summary'
                ? theme.colors.buttonbg
                : theme.colors.bordercolor,
          },
        ]}
        onPress={() => selectFilter('Summary')}
      >
        <FontAwesome6
          name="diagram-project"
          iconStyle="solid"
          size={12}
          color={
            selectedfilter === 'Summary'
              ? theme.colors.iconbuttonicon
              : theme.colors.iconsecondary
          }
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.filterText,
            {
              color:
                selectedfilter === 'Summary'
                  ? theme.colors.iconbuttontext
                  : theme.colors.text,
            },
          ]}
        >
          Summary
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor:
              selectedfilter === 'Cards'
                ? theme.colors.buttonbg
                : 'transparent',
            borderColor:
              selectedfilter === 'Cards'
                ? theme.colors.buttonbg
                : theme.colors.bordercolor,
          },
        ]}
        onPress={() => selectFilter('Cards')}
      >
        <FontAwesome6
          name="clone"
          iconStyle="solid"
          size={12}
          color={
            selectedfilter === 'Cards'
              ? theme.colors.iconbuttonicon
              : theme.colors.iconsecondary
          }
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.filterText,
            {
              color:
                selectedfilter === 'Cards'
                  ? theme.colors.iconbuttontext
                  : theme.colors.text,
            },
          ]}
        >
          Cards
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor:
              selectedfilter === 'Alarms'
                ? theme.colors.buttonbg
                : 'transparent',
            borderColor:
              selectedfilter === 'Alarms'
                ? theme.colors.buttonbg
                : theme.colors.bordercolor,
          },
        ]}
        onPress={() => selectFilter('Alarms')}
      >
        <FontAwesome6
          name="bell"
          iconStyle="solid"
          size={12}
          color={
            selectedfilter === 'Alarms'
              ? theme.colors.iconbuttonicon
              : theme.colors.iconsecondary
          }
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.filterText,
            {
              color:
                selectedfilter === 'Alarms'
                  ? theme.colors.iconbuttontext
                  : theme.colors.text,
            },
          ]}
        >
          Alarms
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor:
              selectedfilter === 'Trend'
                ? theme.colors.buttonbg
                : 'transparent',
            borderColor:
              selectedfilter === 'Trend'
                ? theme.colors.buttonbg
                : theme.colors.bordercolor,
          },
        ]}
        onPress={() => selectFilter('Trend')}
      >
        <FontAwesome6
          name="file-lines"
          iconStyle="solid"
          size={12}
          color={
            selectedfilter === 'Trend'
              ? theme.colors.iconbuttonicon
              : theme.colors.iconsecondary
          }
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.filterText,
            {
              color:
                selectedfilter === 'Trend'
                  ? theme.colors.iconbuttontext
                  : theme.colors.text,
            },
          ]}
        >
          Trend
        </Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
  )
}

export default Filters;

const styles = StyleSheet.create({
    filterRow: {
        flexDirection: 'row',
        marginBottom: 25,
      },
      filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
        marginRight: 8,
        width: 86,
        justifyContent: 'center',
      },
      filterText: {
        fontSize: 8,
        lineHeight: 12,
        fontFamily: getFontFamily('true', 'medium'),
        textAlign: 'center',
      },
})