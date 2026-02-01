import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Themestore from '../../../store/themestore';
import { Searchbar } from 'react-native-paper';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Dropdown from '../../../components/companydetail/dropdown';
import Viewsscreen from './dropdownscreens/viewsscreen';
import Alarmsscreen from './dropdownscreens/alarmsscreen';
import DevicesScreen from './dropdownscreens/devicesscreen';
import LiveparametersScreen from './dropdownscreens/liveparameters';
import { RootStackParamList } from '../../../types/navigation';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import DevicesHealthScreen from './dropdownscreens/devicehealth';

const Companydetailscreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectdropdown, setselecteddropdown] = useState<string>('Views');
  const handledropdown = (value: string) => {
    setselecteddropdown(value);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        scrollEventThrottle={16}
      >
        <View style={styles.searchbarcontainer}>
          <Searchbar
            placeholder="Search"
            rippleColor={'transparent'}
            placeholderTextColor={theme.colors.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onPress={() => navigation.push('SearchScreen')}
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={theme.colors.text}
                size={18}
                style={{ width: 18, height: 18 }}
                name="magnifying-glass"
              />
            )}
            inputStyle={[styles.searchtext, { color: theme.colors.text }]}
            style={[
              styles.searchbar,
              {
                backgroundColor: theme.colors.overlaybackground,
                borderColor: theme.colors.bordercolor,
              },
            ]}
          />
        </View>
        <Dropdown selectdropdown={selectdropdown} handledropdown={handledropdown}/>
        {selectdropdown === 'Views' && <Viewsscreen/> 
        || selectdropdown === 'Live parameters' && <LiveparametersScreen/> 
        || selectdropdown === 'Devices' && <DevicesScreen/> 
        || selectdropdown === 'Devices Health' && <DevicesHealthScreen/> 
        || selectdropdown === 'Alarms' && <Alarmsscreen/> 
        }
      </ScrollView>
    </View>
  );
};

export default Companydetailscreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  searchbarcontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  searchbar: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 1,
    height: 44,
  },
  searchtext: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: getFontFamily('true', 'regular'),
    paddingBottom: 20,
  },
});
