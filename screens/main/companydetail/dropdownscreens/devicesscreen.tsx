import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Themestore from '../../../../store/themestore'

const DevicesScreen: React.FC = () => {
    const theme = Themestore(state => state.theme);
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={{ fontSize: 24, color: theme.colors.title }}>Devices Screen</Text>
    </View>
  )
}

export default DevicesScreen;


const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    }
})