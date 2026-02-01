import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import Themestore from '../../store/themestore';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../assets/utils/fontfamily';
import { Dropdownprops } from '../../types/dropdown';

const Dropdown: React.FC<Dropdownprops> = ({selectdropdown, handledropdown}) => {
    const theme = Themestore(state => state.theme);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);

return (
    <View style={{ marginBottom: 20 }}>
    <TouchableOpacity
      onPress={() => setShowDropdown(!showDropdown)}
      activeOpacity={0.8}
      style={[
        styles.dropdownHeader,
        {
          borderColor: theme.colors.bordercolor,
          backgroundColor: theme.colors.overlaybackground,
        },
      ]}
    >
      <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
        {selectdropdown}
      </Text>
      <FontAwesome6
        name={showDropdown ? 'chevron-up' : 'chevron-down'}
        size={14}
        iconStyle="solid"
        color={theme.colors.title}
      />
    </TouchableOpacity>

    {showDropdown && (
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
          onPress={() => handledropdown('Views')}
        >
          <Text
            style={[
              styles.dropdownItemText,
              {
                color:
                  selectdropdown === 'Views'
                    ? theme.colors.iconcolor
                    : theme.colors.text,
              },
            ]}
          >
            Views
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
          onPress={() => handledropdown('Live parameters')}
        >
          <Text
            style={[
              styles.dropdownItemText,
              {
                color:
                  selectdropdown === 'Live parameters'
                    ? theme.colors.iconcolor
                    : theme.colors.text,
              },
            ]}
          >
            Live parameters
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
          onPress={() => handledropdown('Devices')}
        >
          <Text
            style={[
              styles.dropdownItemText,
              {
                color:
                  selectdropdown === 'Devices'
                    ? theme.colors.iconcolor
                    : theme.colors.text,
              },
            ]}
          >
            Devices
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
          onPress={() => handledropdown('Devices Health')}
        >
          <Text
            style={[
              styles.dropdownItemText,
              {
                color:
                  selectdropdown === 'Devices Health'
                    ? theme.colors.iconcolor
                    : theme.colors.text,
              },
            ]}
          >
            Devices Health
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdownItem}
          onPress={() => handledropdown('Alarms')}
        >
          <Text
            style={[
              styles.dropdownItemText,
              {
                color:
                  selectdropdown === 'Alarms'
                    ? theme.colors.iconcolor
                    : theme.colors.text,
              },
            ]}
          >
            Alarms
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
  )
}

export default Dropdown;


const styles = StyleSheet.create({
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
        top: 55,
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: 15,
        paddingVertical: 5,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 2000,
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
})