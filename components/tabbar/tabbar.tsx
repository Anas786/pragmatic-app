import { StyleSheet, View, Text,Image } from 'react-native';
import React, { useState } from 'react';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { getFontFamily } from '../../assets/utils/fontfamily';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Dashboardscreen from '../../screens/main/dashboard/dashboardscreen';
import Themestore from '../../store/themestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Profilescreen from '../../screens/main/profile/profilescreen';
import HeaderCenterPrimary from '../primaryheader/headercenterprimary';
import HeaderRightPrimary from '../primaryheader/headerrightprimary';
import HeaderleftPrimary from '../primaryheader/headerleftprimary';
import Alertbox from '../utils/alertbox';
import { DrawerActions, useNavigation } from '@react-navigation/native';

// import { UserprofileStore } from '../store/profilestore';

const Drawer = createDrawerNavigator();
const AnalyticsScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View
      style={[styles.placeholder, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.text, { color: theme.colors.title }]}>
        Analytics
      </Text>
    </View>
  );
};
const AddScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View
      style={[styles.placeholder, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.text, { color: theme.colors.title }]}>Add</Text>
    </View>
  );
};
const SettingScreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View
      style={[styles.placeholder, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.text, { color: theme.colors.title }]}>Setting</Text>
    </View>
  );
};

const Tabbar: React.FC = () => {
  const theme = Themestore(state => state.theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [visible, setvisible] = useState({
    visible: false,
    message: '',
    title: 'Alert',
  });
  const showAlert = (msg: string) => setvisible({ visible: true, message: msg, title: 'Alert' });
  // const profileimageicon = UserprofileStore((state) => state.profileImageUri);

  return (
    <>
      <Alertbox
        title="Alert"
        message={visible.message}
        visible={visible.visible}
        setvisible={(val) => setvisible((prev) => ({ ...prev, visible: val }))}
      />
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerStyle: [
            styles.tabBar,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: insets.bottom,
              paddingTop: 10,
            },
          ],
          drawerLabelStyle: [styles.labelStyle, { color: theme.colors.title }],
        }}
      >
        <Drawer.Screen
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
            headerLeft: () => <HeaderleftPrimary setvisible={() => {navigation.dispatch(DrawerActions.openDrawer())}}/>,
            headerRight: () => <HeaderRightPrimary setvisible={() => showAlert('Notification Screen Will Be Here')} />,
            drawerIcon: ({ focused }) => (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.colors.activetintcolor },
                ]}
              >
                <FontAwesome6
                  name="house"
                  size={20}
                  color={
                    focused
                      ? theme.colors.tabbariconactive
                      : theme.colors.tabbariconinactive
                  }
                  iconStyle="solid"
                />
              </View>
            ),
          }}
        />
        <Drawer.Screen
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
            headerLeft: () => <HeaderleftPrimary setvisible={() => showAlert('Drawer will be here')}/>,
            headerRight: () => <HeaderRightPrimary setvisible={() => showAlert('Notification Screen Will Be Here')} />,
            drawerIcon: ({ focused }) => (
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
                  color={
                    focused
                      ? theme.colors.tabbariconactive
                      : theme.colors.tabbariconinactive
                  }
                />
              </View>
            ),
          }}
        />
        <Drawer.Screen
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
            headerLeft: () => <HeaderleftPrimary setvisible={() => showAlert('Drawer will be here')}/>,
            headerRight: () => <HeaderRightPrimary setvisible={() => showAlert('Notification Screen Will Be Here')} />,
            drawerIcon: ({ focused }) => (
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
                  color={
                    focused
                      ? theme.colors.tabbariconactive
                      : theme.colors.tabbariconinactive
                  }
                />
              </View>
            ),
          }}
        />
        <Drawer.Screen
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
            headerLeft: () => <HeaderleftPrimary setvisible={() => showAlert('Drawer will be here')}/>,
            headerRight: () => <HeaderRightPrimary setvisible={() => showAlert('Notification Screen Will Be Here')} />,
            drawerIcon: ({ focused }) => (
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
                  color={
                    focused
                      ? theme.colors.tabbariconactive
                      : theme.colors.tabbariconinactive
                  }
                />
              </View>
            ),
          }}
        />
        <Drawer.Screen
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
            headerLeft: () => <HeaderleftPrimary setvisible={() => showAlert('Drawer will be here')}/>,
            headerRight: () => <HeaderRightPrimary setvisible={() => showAlert('Notification Screen Will Be Here')} />,
            drawerIcon: ({ focused }) => (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.colors.activetintcolor },
                ]}
              >
                {/* {profileimageicon ? */}
                <Image
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: theme.colors.tabbarprofileiconborder,
                  }}
                  source={require('../../assets/profiledummy1.jpg')}
                />
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
      </Drawer.Navigator>
    </>
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
    flex: 1,
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
    color: '#000',
  },
});
