import { Alert, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboardscreen from '../screens/dashboardscreen';
import { Image } from 'react-native';
import Themestore from '../store/themestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Headerimage(): React.JSX.Element {
  return (
    <Image
      style={{ width: 40, height: 27 }}
      source={require('../assets/headerlogo.png')}
    />
  );
}
function Headerleft(): React.JSX.Element {
  const theme = Themestore(state => state.theme);
  return (
    <TouchableOpacity onPress={() => Alert.alert('Drawer will be here')}>
      <FontAwesome6
        name="align-left"
        style={{
          top: 8,
          gap: 7.5,
          width: 20,
          height: 20,
          paddingRight: 2,
          marginLeft: 12,
        }}
        color={theme.colors.iconsecondary}
        size={20}
        iconStyle="solid"
      />
    </TouchableOpacity>
  );
}
function HeaderRight(): React.JSX.Element {
  const theme = Themestore(state => state.theme);
  const toggleTheme = Themestore((state) => state.toggleTheme);
  const mode = Themestore((state) => state.mode);
  return (
    <>
      <TouchableOpacity
        onPress={() => Alert.alert('Notification screen will be open')}
      >
        <FontAwesome6
          name="bell"
          style={{
            top: 7,
            gap: 10,
            width: 20,
            height: 20,
            marginRight: 12,
          }}
          color={theme.colors.iconsecondary}
          size={20}
          iconStyle="regular"
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={toggleTheme}
      >
        <FontAwesome6
          name={mode === 'dark' ? 'sun' : 'moon'}
          style={{
            top: 7,
            gap: 10,
            width: 20,
            height: 20,
            marginRight: 12,
          }}
          color={theme.colors.iconsecondary}
          size={20}
          iconStyle="regular"
        />
      </TouchableOpacity>
    </>
  );
}

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
const ProfileScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.title }]}>Profile</Text>
    </View>
  )
};

const Tabbar: React.FC = () => {
  const Tab = createBottomTabNavigator();
  const theme = Themestore(state => state.theme);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: theme.colors.background, height: 64 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarShowLabel: true,
        tabBarLabelStyle: [styles.labelStyle, { color: theme.colors.title }],
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboardscreen}
        options={{
          headerShown: true,
          headerTitle: () => <Headerimage />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.bordercolor,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.bordercolor,
          },
          headerLeft: () => <Headerleft />,
          headerRight: () => <HeaderRight />,
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
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name="chart-line"
              iconStyle="solid"
              size={20}
              color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name="square-plus"
              iconStyle="regular"
              size={24}
              color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name="gear"
              iconStyle="solid"
              size={20}
              color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name="user"
              iconStyle="regular"
              size={20}
              color={focused ? theme.colors.tabbariconactive : theme.colors.tabbariconinactive}
            />
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
