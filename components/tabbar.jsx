import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import React from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../assets/utils/fontfamily';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboardscreen from '../screens/dashboardscreen';
import { Image } from 'react-native';
import { Text } from 'react-native-svg';

function Headerimage() {
  return (
    <Image
      style={{ width: 40, height: 27 }}
      source={require('../assets/headerlogo.png')}
    />
  );
}
function Headerleft() {
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
        color={'#ffffff'}
        size={20}
        iconStyle="solid"
      />
    </TouchableOpacity>
  );
}
function HeaderRight() {
  return (
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
        color={'#ffffff'}
        size={20}
        iconStyle="regular"
      />
    </TouchableOpacity>
  );
}

const AnalyticsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.text}>Analytics</Text>
  </View>
);
const AddScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.text}>Add</Text>
  </View>
);
const SettingScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.text}>Setting</Text>
  </View>
);
const ProfileScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.text}>Profile</Text>
  </View>
);

const Tabbar = () => {
  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: styles.labelStyle,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          headerShown: true,
          headerTitle: props => <Headerimage {...props} />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#1b1a1b',
            borderWidth: 1,
            borderColor: '#303030',
            borderBottomWidth: 1,
            borderBottomColor: '#303030',
          },
          headerLeft: props => <Headerleft {...props} />,
          headerRight: props => <HeaderRight {...props} />,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.activeIconContainer,
              ]}
            >
              <FontAwesome6
                name="house"
                iconStyle="solid"
                size={20}
                color={focused ? '#08820e' : '#ffffff'}
                solid={focused}
              />
            </View>
          ),
        }}
        component={Dashboardscreen}
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
              color={focused ? '#08820e' : '#ffffff'}
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
              color={focused ? '#08820e' : '#ffffff'}
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
              color={focused ? '#08820e' : '#ffffff'}
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
              color={focused ? '#08820e' : '#ffffff'}
              solid
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
    backgroundColor: '#1b1a1b',
    borderTopWidth: 0,
    elevation: 0,
    height: 75,
    paddingTop: 10,
    marginBottom: 30
  },
  labelStyle: {
    fontSize: 10,
    fontFamily: getFontFamily('true', 'semibold'),
    lineHeight: 12,
    marginTop: 4,
    color: '#ffffff'
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 32,
    borderRadius: 16,
  },
  activeIconContainer: {
    backgroundColor: '#232725',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
});
