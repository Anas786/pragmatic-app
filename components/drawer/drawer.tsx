import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Themestore from '../../store/themestore';
import Aboutscreen from '../../screens/main/about/about';
import HeaderCenterPrimary from '../primaryheader/headercenterprimary';
import HeaderRight from '../primaryheader/headerrightprimary';
import { getFontFamily } from '../../assets/utils/fontfamily';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { Alert } from 'react-native';
import Dashboardscreen from '../../screens/main/dashboard/dashboardscreen';
import Termsandcondition from '../../screens/main/profile/termsandcondition';
import Profilescreen from '../../screens/main/profile/profilescreen';

const Drawer: React.FC = () => {
  const Drawerwidget = createDrawerNavigator();
  const theme = Themestore(state => state.theme);

  return (
    <Drawerwidget.Navigator
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.bordercolor,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.bordercolor,
        },
        headerTitle: () => <HeaderCenterPrimary />,
        headerLeft: () => (
          <FontAwesome6
            name="align-left"
            iconStyle="solid"
            size={20}
            color={theme.colors.title}
            style={{
              top: 8,
              gap: 7.5,
              width: 20,
              height: 20,
              paddingRight: 2,
              marginLeft: 12,
            }}
            onPress={() => navigation.openDrawer()}
          />
        ),
        headerRight: () => (
          <HeaderRight
            setvisible={() => Alert.alert('Notification Screen Will Be Here')}
          />
        ),
        drawerStyle: {
          backgroundColor: theme.colors.overlaybackground,
          borderRadius: 12,
          elevation: 12,
          shadowColor: theme.colors.bordercolor,
          shadowRadius: 12,
        },
        drawerActiveBackgroundColor: theme.colors.background,
        drawerActiveTintColor: theme.colors.highlighted,
        drawerInactiveTintColor: theme.colors.text,
        drawerLabelStyle: {
          fontSize: 12,
          fontFamily: getFontFamily('true', 'medium'),
          lineHeight: 18,
        },
        drawerType: 'slide',
        drawerPosition: 'left',
      })}
    >
      <Drawerwidget.Screen name="Dashboard" component={Dashboardscreen} />
      <Drawerwidget.Screen name="About" component={Aboutscreen} />
      <Drawerwidget.Screen name="Terms" component={Termsandcondition} />
      <Drawerwidget.Screen name="Profile" component={Profilescreen} />
    </Drawerwidget.Navigator>
  );
};

export default Drawer;
