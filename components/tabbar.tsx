import { StyleSheet, View, Text } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboardscreen from '../screens/dashboardscreen';
import { Image } from 'react-native';
import Themestore from '../store/themestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Profilescreen from '../screens/profilescreen';
import HeaderCenterPrimary from './headercenterprimary';
import HeaderRightPrimary from './headerrightprimary';
import HeaderleftPrimary from './headerleftprimary';
// import { UserprofileStore } from '../store/profilestore';

const AnalyticsScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.title }]}>Analytics</Text>
    </View>
  )
};
const AddScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.title }]}>Add</Text>
    </View>
  )
};
const SettingScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.title }]}>Setting</Text>
    </View>
  )
};


const Tabbar: React.FC = () => {
  const Tab = createBottomTabNavigator();
  const theme = Themestore(state => state.theme);
  const insets = useSafeAreaInsets();
  // const profileimageicon = UserprofileStore((state) => state.profileImageUri);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: theme.colors.background, height: 80 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 10 }],
        tabBarShowLabel: true,
        tabBarLabelStyle: [styles.labelStyle, { color: theme.colors.title }],
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboardscreen}
        options={{
          headerShown: true,
          headerTitle: () => <HeaderCenterPrimary />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <HeaderleftPrimary />,
          headerRight: () => <HeaderRightPrimary />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.colors.activetintcolor },
              ]}
            >
              <FontAwesome6
                name="house"
                size={20}
                color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
                iconStyle='solid'
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          headerShown: true,
          headerTitle: () => <HeaderCenterPrimary />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <HeaderleftPrimary />,
          headerRight: () => <HeaderRightPrimary />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.colors.activetintcolor },
              ]}
            >
              <FontAwesome6
                name="chart-line"
                iconStyle="solid"
                size={20}
                color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          headerShown: true,
          headerTitle: () => <HeaderCenterPrimary />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <HeaderleftPrimary />,
          headerRight: () => <HeaderRightPrimary />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.colors.activetintcolor },
              ]}
            >
              <FontAwesome6
                name="square-plus"
                iconStyle="regular"
                size={24}
                color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          headerShown: true,
          headerTitle: () => <HeaderCenterPrimary />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <HeaderleftPrimary />,
          headerRight: () => <HeaderRightPrimary />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.colors.activetintcolor },
              ]}
            >
              <FontAwesome6
                name="gear"
                iconStyle="solid"
                size={20}
                color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profilescreen}
        options={{
          headerShown: true,
          headerTitle: () => <HeaderCenterPrimary />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <HeaderleftPrimary />,
          headerRight: () => <HeaderRightPrimary />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.colors.activetintcolor },
              ]}
            >
              {/* {profileimageicon ? */}
                <Image style={{ width: 24, height: 24, borderRadius: 100, borderWidth: 1, borderColor: theme.colors.tabbarprofileiconborder }} source={require('../assets/profiledummy1.jpg')} />
                 {/* : */}
                {/* // <FontAwesome6
                //   name="user"
                //   iconStyle="regular"
                //   size={20}
                //   color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
                // /> */}
               {/* } */}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default Tabbar;

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  labelStyle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'semibold'),
    lineHeight: 12,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 32,
    borderRadius: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    color: '#000'
  },
});
