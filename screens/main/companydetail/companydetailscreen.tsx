import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Themestore from '../../../store/themestore';
import Summaryblock from '../../../components/companydetail/blocks/summaryblock';
import Cardblock from '../../../components/companydetail/blocks/cardblock';
import Filters from '../../../components/companydetail/filters';
import { Searchbar } from 'react-native-paper';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Dropdown from '../../../components/companydetail/dropdown';
import Alarmblock from '../../../components/companydetail/blocks/alarmblock';
import Trendblock from '../../../components/companydetail/blocks/trendblock';

const Companydetailscreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const [selectedfilter, setselectedfilter] = useState<string>('Summary');
  const selectFilter = (value: string) => {
    setselectedfilter(value);
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inverterfilter, setinverterfilter] = useState<string>('customfilter');
  const selectinverterfilter = (value: string) => {
    setinverterfilter(value);
  }

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
        <Dropdown />
        <Filters selectedfilter={selectedfilter} selectFilter={selectFilter} />
        {(selectedfilter === 'Summary' && <Summaryblock />) ||
          (selectedfilter === 'Cards' && <Cardblock />) ||
          (selectedfilter === 'Alarms' && <Alarmblock />) ||
          (selectedfilter === 'Trend' && (<Trendblock inverterfilter={inverterfilter} selectinverterfilter={selectinverterfilter}/>))}
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
