import { Alert, StyleSheet, Text, View } from 'react-native';
import React, {useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, IconButton, Searchbar } from 'react-native-paper';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../../assets/utils/fontfamily';
import CompanyCard from '../../../components/companydetail/CompanyCard';
import Themestore from '../../../store/themestore';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';

const Dashboardscreen = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const theme = Themestore(state => state.theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();


  return (
    <SafeAreaView edges={['top']} style={[styles.dashboardview, {backgroundColor: theme.colors.background}]}>
      <ScrollView
        contentContainerStyle={{paddingBottom: insets.bottom + 12}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.mainview}
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
                size={20}
                style={{ width: 20, height: 20}}
                name="magnifying-glass"
              />
            )}
            inputStyle={[styles.searchtext, {color: theme.colors.text}]}
            style={[styles.searchbar, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}
          />
          <IconButton
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={theme.colors.inputicon}
                size={20}
                style={{ width: 20, height: 20, transform: [{ rotate: '90deg' }] }}
                name="sliders"
              />
            )}
            onPress={() => Alert.alert('Filter')}
            style={[styles.searchfilterbutton, {backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.inputborder}]}
          />
        </View>
        <View style={[styles.summarytableview,{backgroundColor: theme.colors.overlaybackground, borderColor: theme.colors.bordercolor}]}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[styles.summarytitle, {color: theme.colors.title}]}>Site Summary</Text>
            <Button
              style={[styles.summarybutton, {backgroundColor: theme.colors.iconbuttonbg}]}
              mode="contained"
              icon={() => (
                <FontAwesome6
                  iconStyle="solid"
                  color={theme.colors.iconbuttonicon}
                  size={12}
                  style={{ width: 12, height: 12 }}
                  name="upload"
                />
              )}
              onPress={() => Alert.alert('Export Site Summary')}
              labelStyle={[styles.summarybuttontext,{color: theme.colors.iconbuttontext}]}
            >
              Export
            </Button>
          </View>
        </View>
        <View style={styles.companydatatable}>
          <CompanyCard
            companyName="Lucky Cement Nooribad"
            date="17/12/2025"
            time="07:49 PM"
            logo={require("../../../assets/luckycementlogo.png")}
            onverticalView={() => Alert.alert('Vertical Options')}
            powerReadings={[
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "fan", name: "Wind", iconcolor: "#3a5fd0", value: "3.2345", label: "kWp" },
              { icon: "volcano", name: "Grid", iconcolor: "#d03a3a", value: "4,553.2", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "chart-line", name: "PV Size", iconcolor: "#e8f80c", value: "18,235", label: "kW" },
              { icon: "chart-line", name: "PV Size", iconcolor: "#e8f80c", value: "18,235", label: "kW" },
              { icon: "fan", name: "Wind", iconcolor: "#3a5fd0", value: "3.2345", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Lucky Cement Nooribad')}
            isactive={true}
            isopen={() => navigation.push('Companydetailscreen')}
          />
          <CompanyCard
            companyName="Master Molty Foam"
            date="17/12/2025"
            time="07:49 PM"
            logo={require("../../../assets/mastermoltylogo.jpg")}
            onverticalView={() => Alert.alert('Vertical Options')}
            powerReadings={[
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "chart-line", name: "PV Size", iconcolor: "#e8f80c", value: "18,235", label: "kW" },
              { icon: "chart-line", name: "PV Size", iconcolor: "#e8f80c", value: "18,235", label: "kW" },
              { icon: "fan", name: "Wind", iconcolor: "#3a5fd0", value: "3.2345", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Master Molty Foam')}
            isactive={false}
            isopen={() => Alert.alert('Expand Master Molty Foam')}
          />
          <CompanyCard
            companyName="Young Food Pvt."
            date="17/12/2025"
            time="07:49 PM"
            logo={require("../../../assets/youngsfoodlogo.jpg")}
            onverticalView={() => Alert.alert('Vertical Options')}
            powerReadings={[
              { icon: "chart-line", name: "PV Size", iconcolor: "#e8f80c", value: "18,235", label: "kW" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "solar-panel", name: "Solar", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Young Food Pvt.')}
            isactive={false}
            isopen={() => Alert.alert('Expand Young Food Pvt.')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dashboardview: {
    flex: 1,
    position: 'relative',
  },
  mainview: {
    gap: 20,
    marginHorizontal: 12,
  },
  searchbarcontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 20,
    height: 44,
  },
  searchtext: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: getFontFamily('true', 'regular'),
    paddingBottom: 20,
  },
  searchfilterbutton: {
    borderRadius: 100,
    borderWidth: 1,
    height: 44,
    width: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summarytableview: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 12,
  },
  summarytitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    paddingLeft: 12,
  },
  summarybutton: {
    borderRadius: 65,
  },
  summarybuttontext: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    lineHeight: 12,
  },
  companydatatable: {
    gap: 20,
    marginTop: 12,
  },
});

export default Dashboardscreen;
