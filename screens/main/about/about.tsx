import { StyleSheet, View } from 'react-native'
import React from 'react'
import Themestore from '../../../store/themestore'
import { Text } from 'react-native-gesture-handler';

const Aboutscreen: React.FC = () => {
  const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
     <Text>About Screen</Text>
    </View>
  )
}

export default Aboutscreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  }
})