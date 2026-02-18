import { StyleSheet, View } from 'react-native'
import React from 'react'
import Themestore from '../../../store/themestore'
import Drawer from '../../../components/drawer/drawer';

const Homescreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
     <Drawer/>
    </View>
  )
}

export default Homescreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
})