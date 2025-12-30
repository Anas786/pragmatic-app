import { Alert, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, IconButton, Searchbar } from 'react-native-paper';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import CompanyCard from '../components/CompanyCard';

const Dashboardscreen = () => {
  return (
    <SafeAreaView style={styles.dashboardview}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.mainview}
      >
        <View style={styles.searchbarcontainer}>
          <Searchbar
            placeholder="Search"
            placeholderTextColor={'#6e6e6e'}
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={'#6f6f6f'}
                size={20}
                style={{ width: 20, height: 20 }}
                name="magnifying-glass"
              />
            )}
            inputStyle={styles.searchtext}
            style={styles.searchbar}
          />
          <IconButton
            icon={() => (
              <FontAwesome6
                iconStyle="solid"
                color={'#ffffff'}
                size={20}
                style={{ width: 20, height: 20, transform: [{ rotate: '90deg' }] }}
                name="sliders"
              />
            )}
            onPress={() => Alert.alert('Filter')}
            style={styles.searchfilterbutton}
          />
        </View>
        <View style={styles.summarytableview}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={styles.summarytitle}>Site Summary</Text>
            <Button
              style={styles.summarybutton}
              mode="contained"
              icon={() => (
                <FontAwesome6
                  iconStyle="solid"
                  color={'#ffffff'}
                  size={12}
                  style={{ width: 12, height: 12 }}
                  name="upload"
                />
              )}
              onPress={() => Alert.alert('Export Site Summary')}
              labelStyle={styles.summarybuttontext}
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
            logo={require("../assets/luckycementlogo.png")}
            powerReadings={[
              { icon: "solar-panel", name: "Solar Panel", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "fan", name: "Wind", iconcolor: "#f87a0c", value: "3.2345", label: "kWp" },
              { icon: "volcano", name: "Grid", iconcolor: "#c805bb", value: "4,553.2", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Lucky Cement Nooribad')}
          />
          <CompanyCard
            companyName="Master Molty Foam"
            date="17/12/2025"
            time="07:49 PM"
            logo={require("../assets/mastermoltylogo.jpg")}
            powerReadings={[
              { icon: "solar-panel", name: "Solar Panel", iconcolor: "#05c80e", value: "3.2345", label: "kWp" },
              { icon: "fan", name: "Wind", iconcolor: "#f87a0c", value: "3.2345", label: "kWp" },
              { icon: "volcano", name: "Grid", iconcolor: "#c805bb", value: "4,553.2", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Master Molty Foam')}
          />
          <CompanyCard
            companyName="Young Food Pvt."
            date="17/12/2025"
            time="07:49 PM"
            logo={require("../assets/youngsfoodlogo.jpg")}
            powerReadings={[
              { icon: "chart-line", name: "Solar Panel", iconcolor: "#05c80e", value: "18,235", label: "kW" },
              { icon: "fan", name: "Wind", iconcolor: "#f87a0c", value: "3.2345", label: "kWp" },
              { icon: "volcano", name: "Grid", iconcolor: "#c805bb", value: "3.2345", label: "kWp" },
            ]}
            efficiency={86.56}
            onExpandView={() => Alert.alert('Expand Young Food Pvt.')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dashboardview: {
    flex: 1,
    backgroundColor: '#151314',
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
    borderColor: '#303030',
    paddingHorizontal: 12,
    backgroundColor: '#1b1a1b',
    height: 44,
  },
  searchtext: {
    fontSize: 12,
    color: '#6e6e6e',
    lineHeight: 12,
    fontFamily: getFontFamily('true', 'regular'),
    paddingBottom: 20,
  },
  searchfilterbutton: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1b1a1b',
    height: 44,
    width: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summarytableview: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    marginTop: 20,
    padding: 12,
  },
  summarytitle: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
    color: '#ffffff',
    paddingLeft: 12,
  },
  summarybutton: {
    borderRadius: 65,
    backgroundColor: '#08820E',
    color: '#ffffff',
  },
  summarybuttontext: {
    fontSize: 8,
    fontFamily: getFontFamily('true', 'bold'),
    lineHeight: 12,
  },
  companydatatable: {
    gap: 20,
    marginTop: 12,
    marginBottom: 27,
  },
});

export default Dashboardscreen;
